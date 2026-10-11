import { cache } from 'react'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { Tables } from '@/lib/supabase/database.types'

export type Profile = Tables<'profiles'>

export type Session = {
  userId: string
  email: string | null
  profile: Profile
}

/**
 * The signed-in user and their profile, or `null`. Cached per request, so layouts, pages
 * and actions can all call it without repeating the round trip.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (!profile) return null

  return { userId: user.id, email: user.email ?? null, profile }
})

/** For pages and layouts: the session, or a redirect to the login page. */
export async function requireSession(): Promise<Session> {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}
