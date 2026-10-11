import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai'
import { z } from 'zod'

import { getAccess } from '@/lib/access/queries'
import { hasLevel } from '@/lib/access/types'
import { assistantTools, MODULE_AI } from '@/lib/ai/modules'
import { systemPrompt } from '@/lib/ai/prompt'
import { languageModel } from '@/lib/ai/provider'
import { getAiConfig } from '@/lib/ai/settings'
import { getSession } from '@/lib/auth/session'
import { todayKey } from '@/lib/date-keys'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/database.types'
import { uuidSchema } from '@/lib/validation'

export const maxDuration = 60

/** Fair use: calls per person in a sliding window, and the size of one request. */
const CALLS_PER_WINDOW = 30
const WINDOW_MINUTES = 10
const MAX_REQUEST_CHARS = 20_000

const bodySchema = z.object({
  conversationId: uuidSchema,
  messages: z
    .array(z.custom<UIMessage>(value => typeof value === 'object' && value !== null && 'role' in value))
    .min(1)
    .max(80),
})

/**
 * The chat endpoint. It streams the model's answer while the tools read the person's data under RLS
 * and turn write requests into proposals. Messages are persisted on both ends; every call is logged.
 */
export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Sessione scaduta: accedi di nuovo' }, { status: 401 })
  const access = await getAccess()
  if (!session.profile.is_admin && !hasLevel(access.ai, 'read')) {
    return Response.json({ error: 'Non hai accesso all’assistente' }, { status: 403 })
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Richiesta non valida' }, { status: 400 })
  const { conversationId, messages } = parsed.data

  if (textLength(messages) > MAX_REQUEST_CHARS) {
    return Response.json({ error: 'La conversazione è troppo lunga: iniziane una nuova' }, { status: 413 })
  }

  const config = await getAiConfig()
  if (!config) return Response.json({ error: 'Assistente non configurato' }, { status: 503 })

  const supabase = await createClient()
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString()
  const recent = await supabase
    .from('ai_calls')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', session.profile.id)
    .gte('created_at', windowStart)
  if ((recent.count ?? 0) >= CALLS_PER_WINDOW) {
    return Response.json(
      { error: 'Hai fatto molte richieste in pochi minuti: riprova più tardi' },
      { status: 429 }
    )
  }
  const lastMessage = messages[messages.length - 1]
  if (lastMessage.role === 'user') {
    const saved = await supabase
      .from('ai_messages')
      .insert({
        conversation_id: conversationId,
        role: 'user',
        parts: lastMessage.parts as unknown as NonNullable<Json>,
      })
      .select('id')
    if (saved.error || saved.data.length === 0)
      return Response.json({ error: 'Conversazione non trovata' }, { status: 404 })
    if (messages.length === 1) {
      await supabase
        .from('ai_conversations')
        .update({ title: titleFrom(lastMessage) })
        .eq('id', conversationId)
        .eq('title', 'Nuova conversazione')
    }
  }

  const started = Date.now()
  const result = streamText({
    model: languageModel(config),
    system: systemPrompt({ userName: session.profile.full_name, today: todayKey(), modules: MODULE_AI }),
    messages: await convertToModelMessages(messages),
    tools: assistantTools({ profileId: session.profile.id, access, today: todayKey() }),
    stopWhen: stepCountIs(6),
    onFinish: async ({ totalUsage }) => {
      await supabase.from('ai_calls').insert({
        profile_id: session.profile.id,
        conversation_id: conversationId,
        provider: config.provider,
        model: config.model,
        input_tokens: totalUsage.inputTokens ?? 0,
        output_tokens: totalUsage.outputTokens ?? 0,
        duration_ms: Date.now() - started,
      })
    },
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ responseMessage }) => {
      await supabase.from('ai_messages').insert({
        conversation_id: conversationId,
        role: 'assistant',
        parts: responseMessage.parts as unknown as NonNullable<Json>,
      })
    },
    onError: error =>
      `Il modello non ha risposto: ${error instanceof Error ? error.message.split('\n')[0].slice(0, 160) : 'errore sconosciuto'}`,
  })
}

/** The first words of the first message become the conversation title. */
function titleFrom(message: UIMessage) {
  const text = message.parts
    .map(part => (part.type === 'text' ? part.text : ''))
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ')
  return text.length > 60 ? `${text.slice(0, 57)}…` : text || 'Nuova conversazione'
}

function textLength(messages: UIMessage[]) {
  let total = 0
  for (const message of messages)
    for (const part of message.parts) if (part.type === 'text') total += part.text.length
  return total
}
