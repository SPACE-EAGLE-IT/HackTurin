'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAccess } from '@/lib/access/guard'
import { type ActionResult, fail, ok } from '@/lib/action-result'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { createTask } from '@/lib/tasks/actions'
import type { TaskPriority } from '@/lib/tasks/types'
import { dateKeySchema, fieldErrorsOf, optionalText, uuidSchema } from '@/lib/validation'

import { TICKET_MESSAGE_KINDS, TICKET_PRIORITIES, TICKET_STATUSES, type TicketPriority } from './types'

const ticketFields = {
  title: z.string().trim().min(1, 'Il titolo è obbligatorio').max(200, 'Massimo 200 caratteri'),
  description: optionalText(8000),
  status: z.enum(TICKET_STATUSES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  categoryId: uuidSchema.nullable().optional(),
  requesterId: uuidSchema.nullable().optional(),
  requesterName: optionalText(120),
  requesterEmail: z
    .string()
    .trim()
    .email('Indirizzo e-mail non valido')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  assigneeId: uuidSchema.nullable().optional(),
  projectId: uuidSchema.nullable().optional(),
  /** `YYYY-MM-DD`; stored as noon UTC of that day. */
  dueDate: dateKeySchema.nullable().optional(),
}

const createSchema = z.object(ticketFields)
const updateSchema = z.object(ticketFields).partial()

type TicketInput = z.infer<typeof createSchema>

/** Opens a ticket. Only the title is required; the requester defaults to the person opening it. */
export async function createTicket(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('help_desk', 'write')
  if (denied) return denied

  const session = await getSession()
  const supabase = await createClient()
  const row = toRow(parsed.data)
  const { data, error } = await supabase
    .from('tickets')
    .insert({
      ...row,
      title: parsed.data.title,
      requester_id:
        row.requester_id === undefined && !parsed.data.requesterName
          ? (session?.profile.id ?? null)
          : (row.requester_id ?? null),
      created_by: session?.profile.id ?? null,
    })
    .select('id')
    .single()
  if (error) return fail('Salvataggio non riuscito')

  revalidateTicketRoutes(data.id)
  return ok({ id: data.id })
}

export async function updateTicket(id: string, input: unknown): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(id)
  const parsed = updateSchema.safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return fail('Controlla i campi', parsed.success ? undefined : fieldErrorsOf(parsed.error))
  }
  const denied = await requireAccess('help_desk', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase.from('tickets').update(toRow(parsed.data)).eq('id', id).select('id')
  if (error || data.length === 0) return fail('Modifica non riuscita')

  revalidateTicketRoutes(id)
  return ok()
}

/** Takes the ticket: assigns it to the person and moves it to «In lavorazione» when it was open. */
export async function takeTicket(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail('Dati non validi')
  const denied = await requireAccess('help_desk', 'write')
  if (denied) return denied
  const session = await getSession()
  if (!session) return fail('Sessione scaduta: accedi di nuovo')

  const supabase = await createClient()
  const { data: current } = await supabase.from('tickets').select('status').eq('id', id).maybeSingle()
  if (!current) return fail('Ticket non trovato')
  const { data, error } = await supabase
    .from('tickets')
    .update({
      assignee_id: session.profile.id,
      status: current.status === 'open' ? 'in_progress' : current.status,
    })
    .eq('id', id)
    .select('id')
  if (error || data.length === 0) return fail('Presa in carico non riuscita')

  revalidateTicketRoutes(id)
  return ok()
}

export async function deleteTicket(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail('Dati non validi')
  const denied = await requireAccess('help_desk', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase.from('tickets').delete().eq('id', id).select('id')
  if (error || data.length === 0) return fail('Eliminazione non riuscita')

  revalidateTicketRoutes(id)
  return ok()
}

const messageSchema = z.object({
  ticketId: uuidSchema,
  body: z.string().trim().min(1, 'Scrivi un messaggio').max(8000, 'Massimo 8000 caratteri'),
  kind: z.enum(TICKET_MESSAGE_KINDS).default('reply'),
})

/** Adds a reply (for the requester) or an internal note (for the team). */
export async function addTicketMessage(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = messageSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('help_desk', 'write')
  if (denied) return denied
  const session = await getSession()
  if (!session) return fail('Sessione scaduta: accedi di nuovo')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ticket_messages')
    .insert({
      ticket_id: parsed.data.ticketId,
      author_id: session.profile.id,
      body: parsed.data.body,
      kind: parsed.data.kind,
    })
    .select('id')
    .single()
  if (error) return fail('Invio non riuscito')

  revalidateTicketRoutes(parsed.data.ticketId)
  return ok({ id: data.id })
}

export async function deleteTicketMessage(id: string, ticketId: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success || !uuidSchema.safeParse(ticketId).success)
    return fail('Dati non validi')
  const denied = await requireAccess('help_desk', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase.from('ticket_messages').delete().eq('id', id).select('id')
  if (error || data.length === 0) return fail('Eliminazione non riuscita')

  revalidatePath(`/help-desk/${ticketId}`)
  return ok()
}

const PRIORITY_TO_TASK: Record<TicketPriority, TaskPriority> = {
  urgent: 'high',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

/**
 * The bridge to the Task module: creates a task from the ticket, through the Task module's own action,
 * and keeps the reference on the ticket. One task per ticket.
 */
export async function createTaskFromTicket(ticketId: string): Promise<ActionResult<{ taskId: string }>> {
  if (!uuidSchema.safeParse(ticketId).success) return fail('Dati non validi')
  const denied = await requireAccess('help_desk', 'write')
  if (denied) return denied

  const supabase = await createClient()
  const { data: ticket } = await supabase
    .from('tickets')
    .select('code, title, description, priority, project_id, assignee_id, task_id')
    .eq('id', ticketId)
    .maybeSingle()
  if (!ticket) return fail('Ticket non trovato')
  if (ticket.task_id) return fail('Questo ticket ha già una task')

  const created = await createTask({
    title: `${ticket.code} · ${ticket.title}`,
    description: [`Dal ticket ${ticket.code}: /help-desk/${ticketId}`, ticket.description ?? '']
      .filter(Boolean)
      .join('\n\n'),
    priority: PRIORITY_TO_TASK[ticket.priority],
    projectId: ticket.project_id,
    assigneeId: ticket.assignee_id,
  })
  if (!created.ok) return created

  const { error } = await supabase.from('tickets').update({ task_id: created.data.id }).eq('id', ticketId)
  if (error) return fail('Task creata, ma il collegamento al ticket non è riuscito')

  revalidateTicketRoutes(ticketId)
  return ok({ taskId: created.data.id })
}

const categoryFields = {
  name: z.string().trim().min(1, 'Il nome è obbligatorio').max(60, 'Massimo 60 caratteri'),
  description: optionalText(200),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  isActive: z.boolean().optional(),
}

/** Help desk settings: categories. Needs the `admin` level on the feature. */
export async function createCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object(categoryFields).safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('help_desk', 'admin')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ticket_categories')
    .insert({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      sort_order: parsed.data.sortOrder ?? 100,
    })
    .select('id')
    .single()
  if (error)
    return fail(
      error.code === '23505' ? 'Esiste già una categoria con questo nome' : 'Salvataggio non riuscito'
    )

  revalidateTicketRoutes()
  return ok({ id: data.id })
}

export async function updateCategory(id: string, input: unknown): Promise<ActionResult> {
  const parsedId = uuidSchema.safeParse(id)
  const parsed = z.object(categoryFields).partial().safeParse(input)
  if (!parsedId.success || !parsed.success) {
    return fail('Controlla i campi', parsed.success ? undefined : fieldErrorsOf(parsed.error))
  }
  const denied = await requireAccess('help_desk', 'admin')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ticket_categories')
    .update({
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.sortOrder !== undefined && { sort_order: parsed.data.sortOrder }),
      ...(parsed.data.isActive !== undefined && { is_active: parsed.data.isActive }),
    })
    .eq('id', id)
    .select('id')
  if (error || data.length === 0)
    return fail(
      error?.code === '23505' ? 'Esiste già una categoria con questo nome' : 'Modifica non riuscita'
    )

  revalidateTicketRoutes()
  return ok()
}

/** Deletes a category; its tickets keep working without one. */
export async function deleteCategory(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail('Dati non validi')
  const denied = await requireAccess('help_desk', 'admin')
  if (denied) return denied

  const supabase = await createClient()
  const { data, error } = await supabase.from('ticket_categories').delete().eq('id', id).select('id')
  if (error || data.length === 0) return fail('Eliminazione non riuscita')

  revalidateTicketRoutes()
  return ok()
}

function toRow(input: Partial<TicketInput>) {
  return {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.status !== undefined && { status: input.status }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.categoryId !== undefined && { category_id: input.categoryId }),
    ...(input.requesterId !== undefined && { requester_id: input.requesterId }),
    ...(input.requesterName !== undefined && { requester_name: input.requesterName }),
    ...(input.requesterEmail !== undefined && { requester_email: input.requesterEmail }),
    ...(input.assigneeId !== undefined && { assignee_id: input.assigneeId }),
    ...(input.projectId !== undefined && { project_id: input.projectId }),
    ...(input.dueDate !== undefined && { due_at: input.dueDate ? `${input.dueDate}T12:00:00Z` : null }),
  }
}

function revalidateTicketRoutes(ticketId?: string) {
  revalidatePath('/dashboard')
  revalidatePath('/help-desk')
  revalidatePath('/help-desk/settings')
  if (ticketId) revalidatePath(`/help-desk/${ticketId}`)
  revalidatePath('/tasks')
}
