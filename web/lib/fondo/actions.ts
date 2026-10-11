'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAccess } from '@/lib/access/guard'
import { type ActionResult, fail, ok } from '@/lib/action-result'
import { createClient } from '@/lib/supabase/server'
import { uuidSchema } from '@/lib/validation'

const idsSchema = z.array(uuidSchema).min(1, 'Seleziona almeno una spesa').max(500)

/** Marks the given expenses as paid back by the ETS (already reimbursed ones are left as they are). */
export async function markReimbursed(ids: unknown): Promise<ActionResult<{ count: number }>> {
  const parsed = idsSchema.safeParse(ids)
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Dati non validi')
  const denied = await requireAccess('fondo', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('volunteer_expenses')
    .update({ reimbursed_at: new Date().toISOString() })
    .in('id', parsed.data)
    .is('reimbursed_at', null)
    .select('id')
  if (error) return fail('Operazione non riuscita')

  revalidatePath('/fondo')
  revalidatePath('/missioni', 'layout')
  return ok({ count: data.length })
}
