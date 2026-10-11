'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { z } from 'zod'

import { type ActionResult, fail, ok } from '@/lib/action-result'
import { createClient } from '@/lib/supabase/server'
import { fieldErrorsOf } from '@/lib/validation'

const credentialsSchema = z.object({
  email: z.string().trim().email('Inserisci un indirizzo e-mail valido'),
  password: z.string().min(8, 'Almeno 8 caratteri'),
})

const signUpSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(1, 'Il nome è obbligatorio').max(120),
})

export async function signIn(input: unknown): Promise<ActionResult> {
  const parsed = credentialsSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return fail('E-mail o password non corretti')
  return ok()
}

/**
 * Creates the account. With e-mail confirmation enabled in Supabase the user receives a link that
 * lands on `/auth/callback`; with it disabled the session starts immediately.
 */
export async function signUp(input: unknown): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  const parsed = signUpSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))

  let origin: string
  try {
    origin = await siteOrigin()
  } catch {
    return fail('Configurazione mancante: NEXT_PUBLIC_SITE_URL')
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })
  if (error) return fail(error.message)
  return ok({ needsConfirmation: data.session === null })
}

export async function signOut(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.NODE_ENV === 'production') throw new Error('NEXT_PUBLIC_SITE_URL is required in production')
  // Development only: the request's own host. Supabase also checks the URL against its allow-list.
  const requestHeaders = await headers()
  return `http://${requestHeaders.get('host') ?? 'localhost:3000'}`
}
