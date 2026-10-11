import type { StatusTone } from '@/components/ds/status-badge'
import type { ProjectRef, PersonRef } from '@/lib/tasks/types'
import type { Enums, Tables } from '@/lib/supabase/database.types'

export type TicketStatus = Enums<'ticket_status'>
export type TicketPriority = Enums<'ticket_priority'>
export type TicketMessageKind = Enums<'ticket_message_kind'>
export type TicketRow = Tables<'tickets'>
export type TicketCategory = Tables<'ticket_categories'>

export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting',
  'resolved',
  'closed',
] as const satisfies readonly TicketStatus[]
/** The statuses that count as "still to handle". */
export const OPEN_TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting',
] as const satisfies readonly TicketStatus[]
export const TICKET_PRIORITIES = [
  'urgent',
  'high',
  'medium',
  'low',
] as const satisfies readonly TicketPriority[]
export const TICKET_MESSAGE_KINDS = ['reply', 'note'] as const satisfies readonly TicketMessageKind[]

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Aperto',
  in_progress: 'In lavorazione',
  waiting: 'In attesa',
  resolved: 'Risolto',
  closed: 'Chiuso',
}

export const TICKET_STATUS_TONE: Record<TicketStatus, StatusTone> = {
  open: 'info',
  in_progress: 'warning',
  waiting: 'muted',
  resolved: 'success',
  closed: 'muted',
}

export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = {
  urgent: 'Urgente',
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
}

export const TICKET_PRIORITY_TONE: Record<TicketPriority, StatusTone> = {
  urgent: 'destructive',
  high: 'warning',
  medium: 'info',
  low: 'muted',
}

export const TICKET_MESSAGE_KIND_LABEL: Record<TicketMessageKind, string> = {
  reply: 'Risposta',
  note: 'Nota interna',
}

export type CategoryRef = { id: string; name: string }

export type TicketListItem = Pick<
  TicketRow,
  | 'id'
  | 'code'
  | 'title'
  | 'status'
  | 'priority'
  | 'category_id'
  | 'requester_id'
  | 'requester_name'
  | 'assignee_id'
  | 'project_id'
  | 'due_at'
  | 'first_response_at'
  | 'created_at'
  | 'updated_at'
> & {
  category: CategoryRef | null
  requester: PersonRef | null
  assignee: PersonRef | null
  project: ProjectRef | null
}

export type TicketMessage = Tables<'ticket_messages'> & { author: PersonRef | null }

export type LinkedTask = { id: string; title: string; status: Enums<'task_status'> }

export type TicketDetail = TicketRow & {
  category: CategoryRef | null
  requester: PersonRef | null
  assignee: PersonRef | null
  project: ProjectRef | null
  task: LinkedTask | null
  messages: TicketMessage[]
}

export type TicketFilters = {
  q?: string
  status?: TicketStatus[]
  priority?: TicketPriority[]
  categoryId?: string[]
  /** Profile ids; `none` selects unassigned tickets. */
  assigneeId?: string[]
  /** Only tickets assigned to the given profile. */
  mine?: string
  /** Shortcut for the three open statuses. */
  open?: boolean
  /** Open tickets past their due date. */
  overdue?: boolean
}

export type TicketKpis = {
  open: number
  inProgress: number
  waiting: number
  unassigned: number
  overdue: number
  resolvedLast30Days: number
}

/** The person who asked, whether in the team or outside it. */
export function requesterLabel(ticket: Pick<TicketListItem, 'requester' | 'requester_name'>) {
  return ticket.requester?.full_name ?? ticket.requester_name ?? 'Sconosciuto'
}

export function isTicketOverdue(ticket: Pick<TicketRow, 'status' | 'due_at'>, nowIso: string) {
  return (
    (OPEN_TICKET_STATUSES as readonly string[]).includes(ticket.status) &&
    ticket.due_at !== null &&
    ticket.due_at < nowIso
  )
}
