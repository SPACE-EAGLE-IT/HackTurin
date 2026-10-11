'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAccess } from '@/lib/access/guard'
import { type ActionResult, fail, ok } from '@/lib/action-result'
import { createClient } from '@/lib/supabase/server'
import { dateKeySchema, fieldErrorsOf, optionalText, uuidSchema } from '@/lib/validation'

import { CAPS } from '@/lib/civic/cap'

import { PROJECT_STATUSES } from './types'

const projectFields = {
  name: z.string().trim().min(1, 'Il nome è obbligatorio').max(160, 'Massimo 160 caratteri'),
  clientName: optionalText(160),
  status: z.enum(PROJECT_STATUSES).optional(),
  ownerId: uuidSchema.nullable().optional(),
  dueDate: dateKeySchema.nullable().optional(),
  budgetHours: z.number().min(0).max(999999).nullable().optional(),
  notes: optionalText(4000),
  caps: z
    .array(z.enum(CAPS as [string, ...string[]]))
    .max(40)
    .optional(),
}

const createSchema = z.object(projectFields)
const updateSchema = z.object(projectFields).partial()

type ProjectInput = z.infer<typeof createSchema>

/** Creates a project. The code (`PRJ-001`, …) is assigned by the database. */
export async function createProject(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('projects', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...toRow(parsed.data), name: parsed.data.name })
    .select('id')
    .single()
  if (error) return fail('Salvataggio non riuscito')

  revalidateProjectRoutes(data.id)
  return ok({ id: data.id })
}

export async function updateProject(id: string, input: unknown): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(id)
  const parsed = updateSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return fail('Controlla i campi', parsed.success ? undefined : fieldErrorsOf(parsed.error))
  }
  const denied = await requireAccess('projects', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase.from('projects').update(toRow(parsed.data)).eq('id', id).select('id')
  if (error || data.length === 0) return fail('Modifica non riuscita')

  revalidateProjectRoutes(id)
  return ok()
}

/** Deletes a project; its tasks stay and lose the reference. */
export async function deleteProject(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail('Dati non validi')
  const denied = await requireAccess('projects', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase.from('projects').delete().eq('id', id).select('id')
  if (error || data.length === 0) return fail('Eliminazione non riuscita')

  revalidateProjectRoutes(id)
  revalidatePath('/tasks')
  return ok()
}

function toRow(input: Partial<ProjectInput>) {
  return {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.clientName !== undefined && { client_name: input.clientName }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.ownerId !== undefined && { owner_id: input.ownerId }),
    ...(input.dueDate !== undefined && { due_date: input.dueDate }),
    ...(input.budgetHours !== undefined && { budget_hours: input.budgetHours }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.caps !== undefined && { caps: input.caps }),
  }
}

function revalidateProjectRoutes(projectId: string) {
  revalidatePath('/dashboard')
  revalidatePath('/projects')
  revalidatePath(`/projects/${projectId}`)
}
