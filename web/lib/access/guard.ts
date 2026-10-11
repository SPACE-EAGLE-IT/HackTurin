import { redirect } from 'next/navigation'

import { type ActionResult, fail } from '@/lib/action-result'
import { getSession } from '@/lib/auth/session'

import { can } from './queries'
import type { AccessLevel } from './types'

/**
 * For server actions: `null` when the user may proceed, otherwise the failure to return as is.
 *
 * ```ts
 * const denied = await requireAccess('tasks', 'write')
 * if (denied) return denied
 * ```
 */
export async function requireAccess(
  feature: string,
  required: AccessLevel
): Promise<ActionResult<never> | null> {
  const session = await getSession()
  if (!session) return fail('Sessione scaduta: accedi di nuovo')
  return (await can(feature, required)) ? null : fail('Non hai i permessi per questa operazione')
}

/** For server actions reserved to admins (the Access module). */
export async function requireAdmin(): Promise<ActionResult<never> | null> {
  const session = await getSession()
  if (!session) return fail('Sessione scaduta: accedi di nuovo')
  return session.profile.is_admin ? null : fail('Operazione riservata agli amministratori')
}

/** For pages: continues when the user may see the feature, otherwise sends them to the "no access" page. */
export async function requirePageAccess(feature: string, required: AccessLevel = 'read'): Promise<void> {
  if (!(await can(feature, required))) redirect(`/forbidden?feature=${encodeURIComponent(feature)}`)
}
