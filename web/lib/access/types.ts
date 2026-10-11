import type { Enums, Tables } from '@/lib/supabase/database.types'

export type AccessLevel = Enums<'access_level'>
export type Feature = Tables<'features'>

/** Levels from the weakest to the strongest; the order is the comparison. */
export const ACCESS_LEVELS = ['none', 'read', 'write', 'admin'] as const satisfies readonly AccessLevel[]

export const ACCESS_LEVEL_LABEL: Record<AccessLevel, string> = {
  none: 'Nessuno',
  read: 'Lettura',
  write: 'Scrittura',
  admin: 'Gestione',
}

export const ACCESS_LEVEL_DESCRIPTION: Record<AccessLevel, string> = {
  none: 'La sezione non compare.',
  read: 'Vede i dati, non li modifica.',
  write: 'Crea, modifica ed elimina.',
  admin: 'Gestisce anche le impostazioni della sezione.',
}

/** Feature key → level held by the current user. Admins hold `admin` on everything. */
export type AccessMap = Record<string, AccessLevel>

export function accessRank(level: AccessLevel) {
  return ACCESS_LEVELS.indexOf(level)
}

export function hasLevel(held: AccessLevel | undefined, required: AccessLevel) {
  return accessRank(held ?? 'none') >= accessRank(required)
}
