'use server'

import { randomBytes } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAccess } from '@/lib/access/guard'
import { type ActionResult, fail, ok } from '@/lib/action-result'
import { hashKey } from '@/lib/pod/request'
import { createClient } from '@/lib/supabase/server'
import { fieldErrorsOf, optionalText, uuidSchema } from '@/lib/validation'

import { API_KEY_PREFIX, API_KEY_PREFIX_LENGTH, DEVICE_TYPES } from './types'

type Supabase = Awaited<ReturnType<typeof createClient>>

const createDeviceSchema = z.object({
  name: z.string().trim().min(1, 'Il nome è obbligatorio').max(80, 'Massimo 80 caratteri'),
  type: z.enum(DEVICE_TYPES).default('fixed'),
  label: optionalText(160),
  keyLabel: optionalText(120),
  /** False when the assistant creates the POD: the key is then made from the POD page. */
  withKey: z.boolean().default(true),
})

/** Generates a key, stores only its prefix and hash, returns the plain key (shown once). */
async function insertKey(supabase: Supabase, deviceId: string, label: string | null) {
  const apiKey = `${API_KEY_PREFIX}${randomBytes(24).toString('base64url')}`
  const { error } = await supabase.from('api_keys').insert({
    device_id: deviceId,
    key_prefix: apiKey.slice(0, API_KEY_PREFIX_LENGTH),
    key_hash: hashKey(apiKey),
    label,
  })
  return error ? null : apiKey
}

function revalidatePod(id?: string) {
  revalidatePath('/pod')
  if (id) revalidatePath(`/pod/${id}`)
}

/** Creates a POD and, unless asked otherwise, its first API key. */
export async function createDevice(
  input: unknown
): Promise<ActionResult<{ id: string; apiKey: string | null }>> {
  const parsed = createDeviceSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('pod', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { name, type, label, keyLabel, withKey } = parsed.data
  const { data, error } = await supabase
    .from('devices')
    .insert({ name, type, label: label ?? null })
    .select('id')
    .single()
  if (error) return fail('Salvataggio non riuscito')

  let apiKey: string | null = null
  if (withKey) {
    apiKey = await insertKey(supabase, data.id, keyLabel ?? null)
    if (!apiKey) {
      revalidatePod(data.id)
      return fail('POD creato, ma la chiave non è stata generata: creala dalla pagina del POD')
    }
  }
  revalidatePod(data.id)
  return ok({ id: data.id, apiKey })
}

/** Creates a new API key for a POD; the plain key is returned once. */
export async function createKey(deviceId: string, label?: string): Promise<ActionResult<{ apiKey: string }>> {
  const parsedId = uuidSchema.safeParse(deviceId)
  const parsedLabel = optionalText(120).safeParse(label)
  if (!parsedId.success || !parsedLabel.success) return fail('Dati non validi')
  const denied = await requireAccess('pod', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const apiKey = await insertKey(supabase, deviceId, parsedLabel.data ?? null)
  if (!apiKey) return fail('Generazione della chiave non riuscita')
  revalidatePod(deviceId)
  return ok({ apiKey })
}

/** Revokes a key: the POD using it gets 401 from then on. */
export async function revokeKey(keyId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(keyId).success) return fail('Dati non validi')
  const denied = await requireAccess('pod', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .is('revoked_at', null)
    .select('device_id')
  if (error || data.length === 0) return fail('Revoca non riuscita')
  revalidatePod(data[0].device_id)
  return ok()
}

export async function setDeviceActive(id: string, active: boolean): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || typeof active !== 'boolean') return fail('Dati non validi')
  const denied = await requireAccess('pod', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase.from('devices').update({ active }).eq('id', id).select('id')
  if (error || data.length === 0) return fail('Modifica non riuscita')
  revalidatePod(id)
  return ok()
}

export async function updateDeviceLabel(id: string, label: string): Promise<ActionResult> {
  const parsedLabel = optionalText(160).safeParse(label)
  if (!uuidSchema.safeParse(id).success || !parsedLabel.success) return fail('Dati non validi')
  const denied = await requireAccess('pod', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('devices')
    .update({ label: parsedLabel.data ?? null })
    .eq('id', id)
    .select('id')
  if (error || data.length === 0) return fail('Modifica non riuscita')
  revalidatePod(id)
  return ok()
}
