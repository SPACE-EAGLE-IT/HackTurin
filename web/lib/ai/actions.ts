'use server'

import { generateText, type UIMessage } from 'ai'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAccess, requireAdmin } from '@/lib/access/guard'
import { type ActionResult, fail, ok } from '@/lib/action-result'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { fieldErrorsOf, uuidSchema } from '@/lib/validation'

import { findProposal } from './modules'
import { getConversationMessages, listConversations } from './queries'
import { languageModel } from './provider'
import { getAiConfig } from './settings'
import { AI_PROVIDERS, type AiProvider, type ConversationSummary } from './types'

const settingsSchema = z.object({
  provider: z.enum(AI_PROVIDERS),
  model: z.string().trim().min(1, 'Indica il modello').max(120),
  baseUrl: z.string().trim().url('URL non valido').nullable().optional(),
  apiKey: z.string().trim().max(500).optional(),
})

type SettingsInput = z.infer<typeof settingsSchema>

/** Saves provider, model, base URL and (when given) the key. Admins only; the key goes to Vault. */
export async function saveAiSettings(input: unknown): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAdmin()
  if (denied) return denied
  const invalid = validateProviderInput(parsed.data)
  if (invalid) return invalid

  const supabase = await createClient()
  const { error } = await supabase.rpc('ai_settings_save', {
    p_provider: parsed.data.provider,
    p_model: parsed.data.model,
    p_base_url: parsed.data.baseUrl ?? '',
    p_api_key: parsed.data.apiKey ?? '',
  })
  if (error)
    return fail(
      error.message.includes('API key is required')
        ? 'Serve la chiave API la prima volta'
        : 'Salvataggio non riuscito'
    )

  revalidatePath('/assistant/setup')
  revalidatePath('/assistant')
  return ok()
}

/**
 * Sends one tiny request with the given settings (or the stored key when none is typed) and reports
 * the outcome. It is a real, paid call, so it leaves its row in `ai_calls`.
 */
export async function testAiSettings(
  input: unknown
): Promise<ActionResult<{ reply: string; durationMs: number; inputTokens: number; outputTokens: number }>> {
  const parsed = settingsSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAdmin()
  if (denied) return denied
  const invalid = validateProviderInput(parsed.data)
  if (invalid) return invalid

  let apiKey = parsed.data.apiKey ?? ''
  if (!apiKey) {
    const stored = await getAiConfig()
    if (!stored) return fail('Serve la chiave API la prima volta')
    apiKey = stored.apiKey
  }

  const started = Date.now()
  try {
    const result = await generateText({
      model: languageModel({
        provider: parsed.data.provider,
        model: parsed.data.model,
        baseUrl: parsed.data.baseUrl ?? null,
        apiKey,
      }),
      prompt: 'Rispondi solo con la parola: pronto',
      maxOutputTokens: 20,
      abortSignal: AbortSignal.timeout(20000),
    })
    const durationMs = Date.now() - started
    await logCall(
      parsed.data.provider,
      parsed.data.model,
      result.usage.inputTokens ?? 0,
      result.usage.outputTokens ?? 0,
      durationMs
    )
    return ok({
      reply: result.text.trim(),
      durationMs,
      inputTokens: result.usage.inputTokens ?? 0,
      outputTokens: result.usage.outputTokens ?? 0,
    })
  } catch (error) {
    return fail(`Il modello non ha risposto: ${describeProviderError(error)}`)
  }
}

export async function createConversation(): Promise<ActionResult<{ id: string }>> {
  const denied = await requireAccess('ai', 'read')
  if (denied) return denied
  const session = await getSession()
  if (!session) return fail('Sessione scaduta: accedi di nuovo')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_conversations')
    .insert({ profile_id: session.profile.id })
    .select('id')
    .single()
  if (error) return fail('Creazione non riuscita')
  revalidatePath('/assistant')
  return ok({ id: data.id })
}

export async function deleteConversation(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail('Dati non validi')
  const denied = await requireAccess('ai', 'read')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase.from('ai_conversations').delete().eq('id', id).select('id')
  if (error || data.length === 0) return fail('Eliminazione non riuscita')
  revalidatePath('/assistant')
  return ok()
}

const confirmSchema = z.object({ kind: z.string().min(1).max(60), input: z.unknown() })

/**
 * Runs a proposal the person confirmed. The module validates the input again and its own server
 * action checks access and writes as the user.
 */
export async function confirmProposal(input: unknown): Promise<ActionResult<{ href?: string }>> {
  const parsed = confirmSchema.safeParse(input)
  if (!parsed.success) return fail('Dati non validi')
  const denied = await requireAccess('ai', 'read')
  if (denied) return denied

  const definition = findProposal(parsed.data.kind)
  if (!definition) return fail('Proposta non riconosciuta')
  const validated = definition.schema.safeParse(parsed.data.input)
  if (!validated.success) return fail('La proposta non è più valida', fieldErrorsOf(validated.error))
  return definition.run(validated.data as never)
}

function validateProviderInput(input: SettingsInput): ActionResult<never> | null {
  if (input.provider === 'openai_compatible' && !input.baseUrl) {
    return fail('Controlla i campi', { baseUrl: 'Serve l’URL base dell’endpoint' })
  }
  return null
}

async function logCall(
  provider: AiProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
  durationMs: number
) {
  const session = await getSession()
  const supabase = await createClient()
  await supabase.from('ai_calls').insert({
    profile_id: session?.profile.id ?? null,
    provider,
    model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    duration_ms: durationMs,
  })
}

/** A short, safe message from a provider error: status and first line, never the key or the stack. */
function describeProviderError(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError')
      return 'nessuna risposta entro 20 secondi'
    const status = (error as { statusCode?: number }).statusCode
    const line = error.message.split('\n')[0].slice(0, 160)
    return status ? `${status} · ${line}` : line
  }
  return 'errore sconosciuto'
}

/** The person's conversations, for the panel menu. */
export async function listMyConversations(): Promise<ActionResult<ConversationSummary[]>> {
  const denied = await requireAccess('ai', 'read')
  if (denied) return denied
  return ok(await listConversations(12))
}

/** The messages of one of the person's conversations, to reopen it in the panel. */
export async function loadConversation(id: string): Promise<ActionResult<{ messages: UIMessage[] }>> {
  if (!uuidSchema.safeParse(id).success) return fail('Dati non validi')
  const denied = await requireAccess('ai', 'read')
  if (denied) return denied
  const messages = await getConversationMessages(id)
  if (!messages) return fail('Conversazione non trovata')
  return ok({ messages })
}
