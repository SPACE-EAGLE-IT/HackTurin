import { createClient } from '@/lib/supabase/server'
import type { PersonRef } from '@/lib/tasks/types'

/** Everyone who can be assigned work, alphabetically. */
export async function listPeople(): Promise<PersonRef[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .order('full_name')
  if (error) throw error
  return data
}
