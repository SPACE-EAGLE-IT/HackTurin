import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/lib/supabase/database.types'
import { supabaseEnv } from '@/lib/supabase/env'

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * It acts as the signed-in user: every query is subject to Row Level Security.
 */
export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = supabaseEnv()

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Called from a Server Component, which cannot write cookies.
          // The proxy refreshes the session on the next request instead.
        }
      },
    },
  })
}
