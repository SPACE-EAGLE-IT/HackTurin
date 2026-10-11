'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { type ActionResult, fail, ok } from '@/lib/action-result'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { fieldErrorsOf, uuidSchema } from '@/lib/validation'

import { requireAdmin } from './guard'
import { ACCESS_LEVELS } from './types'

const setLevelSchema = z.object({
  profileId: uuidSchema,
  featureKey: z.string().min(1),
  level: z.enum(ACCESS_LEVELS),
})

/** Changes the level one person holds on one feature. Admins only. */
export async function setAccessLevel(input: unknown): Promise<ActionResult> {
  const parsed = setLevelSchema.safeParse(input)
  if (!parsed.success) return fail('Dati non validi', fieldErrorsOf(parsed.error))
  const denied = await requireAdmin()
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('feature_access')
    .upsert({
      profile_id: parsed.data.profileId,
      feature_key: parsed.data.featureKey,
      level: parsed.data.level,
    })
    .select('profile_id')
  if (error || data.length === 0) return fail('Modifica non riuscita')

  revalidatePath('/access')
  revalidatePath('/', 'layout')
  return ok()
}

const setAdminSchema = z.object({ profileId: uuidSchema, isAdmin: z.boolean() })

/** Grants or removes the admin flag. The last admin cannot remove their own flag. */
export async function setAdmin(input: unknown): Promise<ActionResult> {
  const parsed = setAdminSchema.safeParse(input)
  if (!parsed.success) return fail('Dati non validi', fieldErrorsOf(parsed.error))
  const denied = await requireAdmin()
  if (denied) return denied

  const supabase = await createClient()
  if (!parsed.data.isAdmin) {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_admin', true)
    const session = await getSession()
    if ((count ?? 0) <= 1 && session?.profile.id === parsed.data.profileId) {
      return fail('Sei l’unico amministratore: nomina prima qualcun altro')
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ is_admin: parsed.data.isAdmin })
    .eq('id', parsed.data.profileId)
    .select('id')
  if (error || data.length === 0) return fail('Modifica non riuscita')

  revalidatePath('/access')
  revalidatePath('/', 'layout')
  return ok()
}

const createPersonSchema = z.object({
  fullName: z.string().trim().min(1, 'Il nome è obbligatorio').max(120),
  email: z.string().trim().email('Indirizzo e-mail non valido').nullable().optional(),
})

/** Adds a person before they sign up; signing up with the same e-mail links the account. Admins only. */
export async function createPerson(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createPersonSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAdmin()
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .insert({ full_name: parsed.data.fullName, email: parsed.data.email ?? null })
    .select('id')
    .single()
  if (error)
    return fail(
      error.code === '23505' ? 'Esiste già una persona con questa e-mail' : 'Salvataggio non riuscito'
    )

  revalidatePath('/access')
  return ok({ id: data.id })
}
