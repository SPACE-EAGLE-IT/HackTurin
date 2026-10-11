import { cache } from 'react'

import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

import { type AccessLevel, type AccessMap, type Feature, hasLevel } from './types'

/** All features, in navigation order. */
export async function listFeatures(): Promise<Feature[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('features').select('*').order('sort_order')
  if (error) throw error
  return data
}

/** The access map of the signed-in user. Empty when there is no session. Cached per request. */
export const getAccess = cache(async (): Promise<AccessMap> => {
  const session = await getSession()
  if (!session) return {}

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('feature_access')
    .select('feature_key, level')
    .eq('profile_id', session.profile.id)
  if (error) throw error

  const map: AccessMap = {}
  for (const row of data) map[row.feature_key] = session.profile.is_admin ? 'admin' : row.level
  return map
})

/** True when the signed-in user holds at least `required` on `feature`. */
export async function can(feature: string, required: AccessLevel = 'read'): Promise<boolean> {
  const session = await getSession()
  if (!session) return false
  if (session.profile.is_admin) return true
  const access = await getAccess()
  return hasLevel(access[feature], required)
}

export type AccessMatrixRow = {
  profile: {
    id: string
    full_name: string
    email: string | null
    avatar_url: string | null
    is_admin: boolean
    user_id: string | null
  }
  levels: AccessMap
}

/** People × features, for the Access module. */
export async function listAccessMatrix(): Promise<{ features: Feature[]; rows: AccessMatrixRow[] }> {
  const supabase = await createClient()
  const [features, profiles, access] = await Promise.all([
    listFeatures(),
    supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, is_admin, user_id')
      .order('full_name'),
    supabase.from('feature_access').select('profile_id, feature_key, level'),
  ])
  if (profiles.error) throw profiles.error
  if (access.error) throw access.error

  const byProfile = new Map<string, AccessMap>()
  for (const row of access.data) {
    const levels = byProfile.get(row.profile_id) ?? {}
    levels[row.feature_key] = row.level
    byProfile.set(row.profile_id, levels)
  }

  return {
    features,
    rows: profiles.data.map(profile => ({ profile, levels: byProfile.get(profile.id) ?? {} })),
  }
}
