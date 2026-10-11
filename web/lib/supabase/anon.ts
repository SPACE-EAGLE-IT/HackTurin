import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'
import { supabaseEnv } from '@/lib/supabase/env'

/**
 * Client without a session, for public pages, the POD API and the payment webhook.
 * It can only call the security-definer entry points granted to `anon`: no table is readable.
 */
export function createAnonClient() {
  const { url, key } = supabaseEnv()
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
