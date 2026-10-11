import { createClient } from '@/lib/supabase/server'
import { escapeLike } from '@/lib/validation'

import {
  OPEN_TICKET_STATUSES,
  type TicketCategory,
  type TicketDetail,
  type TicketFilters,
  type TicketKpis,
  type TicketListItem,
  type TicketMessage,
} from './types'

const PERSON = 'id, full_name, avatar_url'
const RELATIONS = `category:ticket_categories(id, name), requester:profiles!tickets_requester_id_fkey(${PERSON}), assignee:profiles!tickets_assignee_id_fkey(${PERSON}), project:projects(id, code, name)`
const LIST_COLUMNS = `id, code, title, status, priority, category_id, requester_id, requester_name, assignee_id, project_id, due_at, first_response_at, created_at, updated_at, ${RELATIONS}`

/** Tickets matching the filters, newest first. */
export async function listTickets(filters: TicketFilters = {}): Promise<TicketListItem[]> {
  const supabase = await createClient()
  let query = supabase.from('tickets').select(LIST_COLUMNS)

  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`
    query = query.or(`title.ilike.${pattern},code.ilike.${pattern},requester_name.ilike.${pattern}`)
  }
  if (filters.status?.length) query = query.in('status', filters.status)
  if (filters.open) query = query.in('status', [...OPEN_TICKET_STATUSES])
  if (filters.priority?.length) query = query.in('priority', filters.priority)
  if (filters.categoryId?.length) query = query.in('category_id', filters.categoryId)
  if (filters.mine) query = query.eq('assignee_id', filters.mine)
  if (filters.assigneeId?.length) {
    const ids = filters.assigneeId.filter(value => value !== 'none')
    const parts: string[] = []
    if (ids.length) parts.push(`assignee_id.in.(${ids.join(',')})`)
    if (filters.assigneeId.includes('none')) parts.push('assignee_id.is.null')
    query = query.or(parts.join(','))
  }
  if (filters.overdue)
    query = query.in('status', [...OPEN_TICKET_STATUSES]).lt('due_at', new Date().toISOString())

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .overrideTypes<TicketListItem[], { merge: false }>()
  if (error) throw error
  return data
}

/** One ticket with its relations, the linked task and the conversation, or `null`. */
export async function getTicket(id: string): Promise<TicketDetail | null> {
  const supabase = await createClient()
  const [ticket, messages] = await Promise.all([
    supabase
      .from('tickets')
      .select(`*, ${RELATIONS}, task:tasks(id, title, status)`)
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<Omit<TicketDetail, 'messages'>, { merge: false }>(),
    listTicketMessages(id),
  ])
  if (ticket.error) throw ticket.error
  if (!ticket.data) return null
  return { ...ticket.data, messages }
}

export async function listTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ticket_messages')
    .select(`*, author:profiles(${PERSON})`)
    .eq('ticket_id', ticketId)
    .order('created_at')
    .overrideTypes<TicketMessage[], { merge: false }>()
  if (error) throw error
  return data
}

/** The numbers of the Help desk header. */
export async function getTicketKpis(): Promise<TicketKpis> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('tickets').select('status, assignee_id, due_at, resolved_at')
  if (error) throw error

  const now = new Date().toISOString()
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const kpis: TicketKpis = {
    open: 0,
    inProgress: 0,
    waiting: 0,
    unassigned: 0,
    overdue: 0,
    resolvedLast30Days: 0,
  }
  for (const ticket of data) {
    if (ticket.status === 'resolved' || ticket.status === 'closed') {
      if (ticket.resolved_at && ticket.resolved_at >= monthAgo) kpis.resolvedLast30Days++
      continue
    }
    kpis.open++
    if (ticket.status === 'in_progress') kpis.inProgress++
    if (ticket.status === 'waiting') kpis.waiting++
    if (!ticket.assignee_id) kpis.unassigned++
    if (ticket.due_at && ticket.due_at < now) kpis.overdue++
  }
  return kpis
}

/** Categories in display order; inactive ones only when asked (settings, old tickets). */
export async function listCategories({ includeInactive = false } = {}): Promise<TicketCategory[]> {
  const supabase = await createClient()
  let query = supabase.from('ticket_categories').select('*').order('sort_order').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  const { data, error } = await query
  if (error) throw error
  return data
}
