'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAccess } from '@/lib/access/guard'
import { type ActionResult, fail, ok } from '@/lib/action-result'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { dateKeySchema, fieldErrorsOf, optionalText, uuidSchema } from '@/lib/validation'

import { TASK_PRIORITIES, TASK_STATUSES } from './types'

const taskFields = {
  title: z.string().trim().min(1, 'Il titolo è obbligatorio').max(200, 'Massimo 200 caratteri'),
  description: optionalText(4000),
  projectId: uuidSchema.nullable().optional(),
  assigneeId: uuidSchema.nullable().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: dateKeySchema.nullable().optional(),
  estimatedHours: z.number().min(0).max(9999).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
}

const createSchema = z.object(taskFields)
const updateSchema = z.object(taskFields).partial()

type TaskInput = z.infer<typeof createSchema>

/** Creates a task. Only the title is required. */
export async function createTask(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('tasks', 'write')
  if (denied) return denied

  const session = await getSession()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...toRow(parsed.data), title: parsed.data.title, created_by: session?.profile.id ?? null })
    .select('id, project_id')
    .single()
  if (error) return fail('Salvataggio non riuscito')

  revalidateTaskRoutes(data.id, [data.project_id])
  return ok({ id: data.id })
}

/** Updates the given fields of a task. */
export async function updateTask(id: string, input: unknown): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(id)
  const parsed = updateSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return fail('Controlla i campi', parsed.success ? undefined : fieldErrorsOf(parsed.error))
  }
  const denied = await requireAccess('tasks', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data: before } = await supabase.from('tasks').select('project_id').eq('id', id).maybeSingle()
  const { data, error } = await supabase
    .from('tasks')
    .update(toRow(parsed.data))
    .eq('id', id)
    .select('project_id')
  if (error || data.length === 0) return fail('Modifica non riuscita')

  revalidateTaskRoutes(id, [before?.project_id ?? null, data[0].project_id])
  return ok()
}

const moveSchema = z.object({
  id: uuidSchema,
  status: z.enum(TASK_STATUSES),
  /** Ids of the tasks in the destination column, in their new order. */
  orderedIds: z.array(uuidSchema).max(500),
})

/** Board drag: sets the status and rewrites the positions of the destination column. */
export async function moveTask(input: unknown): Promise<ActionResult> {
  const parsed = moveSchema.safeParse(input)
  if (!parsed.success) return fail('Dati non validi')
  const denied = await requireAccess('tasks', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { id, status, orderedIds } = parsed.data
  const moved = await supabase.from('tasks').update({ status }).eq('id', id).select('project_id')
  if (moved.error || moved.data.length === 0) return fail('Spostamento non riuscito')

  const updates = orderedIds.map((taskId, position) =>
    supabase.from('tasks').update({ position }).eq('id', taskId)
  )
  const results = await Promise.all(updates)
  if (results.some(result => result.error)) return fail('Riordino non riuscito')

  revalidateTaskRoutes(id, [moved.data[0].project_id])
  return ok()
}

export async function deleteTask(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail('Dati non validi')
  const denied = await requireAccess('tasks', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase.from('tasks').delete().eq('id', id).select('project_id')
  if (error || data.length === 0) return fail('Eliminazione non riuscita')

  revalidateTaskRoutes(id, [data[0].project_id])
  return ok()
}

const commentSchema = z.object({
  taskId: uuidSchema,
  body: z.string().trim().min(1, 'Scrivi un commento').max(4000, 'Massimo 4000 caratteri'),
})

export async function addComment(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = commentSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('tasks', 'write')
  if (denied) return denied

  const session = await getSession()
  if (!session) return fail('Sessione scaduta: accedi di nuovo')
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_comments')
    .insert({ task_id: parsed.data.taskId, body: parsed.data.body, author_id: session.profile.id })
    .select('id')
    .single()
  if (error) return fail('Invio non riuscito')

  revalidatePath(`/tasks/${parsed.data.taskId}`)
  return ok({ id: data.id })
}

export async function deleteComment(id: string, taskId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(taskId).success)
    return fail('Dati non validi')
  const denied = await requireAccess('tasks', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase.from('task_comments').delete().eq('id', id).select('id')
  if (error || data.length === 0) return fail('Eliminazione non riuscita')

  revalidatePath(`/tasks/${taskId}`)
  return ok()
}

/** Maps the camelCase input to the table's columns, leaving out fields that were not sent. */
function toRow(input: Partial<TaskInput>) {
  return {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.projectId !== undefined && { project_id: input.projectId }),
    ...(input.assigneeId !== undefined && { assignee_id: input.assigneeId }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.dueDate !== undefined && { due_date: input.dueDate }),
    ...(input.estimatedHours !== undefined && { estimated_hours: input.estimatedHours }),
    ...(input.tags !== undefined && { tags: input.tags }),
  }
}

function revalidateTaskRoutes(taskId: string, projectIds: Array<string | null>) {
  revalidatePath('/dashboard')
  revalidatePath('/tasks')
  revalidatePath(`/tasks/${taskId}`)
  revalidatePath('/projects')
  for (const projectId of new Set(projectIds)) if (projectId) revalidatePath(`/projects/${projectId}`)
}

const routeSchema = z.object({
  taskIds: z.array(uuidSchema).min(1).max(80),
  assigneeId: uuidSchema,
  dueDate: dateKeySchema,
})

/** Assigns an optimised round to a crew: same person, same day, stops in route order. */
export async function assignRoute(input: unknown): Promise<ActionResult> {
  const parsed = routeSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla il giro')
  const denied = await requireAccess('tasks', 'write')
  if (denied) return denied
  const supabase = await createClient()
  for (const [position, id] of parsed.data.taskIds.entries()) {
    const { error } = await supabase
      .from('tasks')
      .update({
        assignee_id: parsed.data.assigneeId,
        due_date: parsed.data.dueDate,
        position,
        status: 'todo',
      })
      .eq('id', id)
      .neq('status', 'done')
    if (error) return fail('Assegnazione non riuscita')
  }
  revalidatePath('/tasks')
  revalidatePath('/tasks/percorsi')
  return ok()
}
