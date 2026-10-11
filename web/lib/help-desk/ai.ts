import { tool } from 'ai'
import { z } from 'zod'

import { hasLevel } from '@/lib/access/types'
import { ok } from '@/lib/action-result'
import { defineProposal, type ModuleAi, proposalTool } from '@/lib/ai/registry'
import { uuidSchema } from '@/lib/validation'

import { addTicketMessage, createTicket, updateTicket } from './actions'
import { getTicket, getTicketKpis, listTickets } from './queries'
import {
  requesterLabel,
  TICKET_MESSAGE_KINDS,
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUSES,
  type TicketListItem,
} from './types'

const createTicketSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(8000).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  categoryId: uuidSchema.optional().describe('Id della categoria, da list_tickets o dalle categorie note'),
  requesterName: z.string().max(120).optional().describe('Chi chiede, se non è della squadra'),
  assigneeId: uuidSchema.optional().describe('Id della persona, da list_people'),
})
const setStatusSchema = z.object({ id: uuidSchema, status: z.enum(TICKET_STATUSES) })
const assignSchema = z.object({ id: uuidSchema, assigneeId: uuidSchema.nullable() })
const replySchema = z.object({
  id: uuidSchema,
  body: z.string().trim().min(1).max(8000),
  kind: z.enum(TICKET_MESSAGE_KINDS).default('reply').describe('reply = al richiedente, note = nota interna'),
})

function compact(ticket: TicketListItem) {
  return {
    id: ticket.id,
    code: ticket.code,
    title: ticket.title,
    status: TICKET_STATUS_LABEL[ticket.status],
    priority: TICKET_PRIORITY_LABEL[ticket.priority],
    category: ticket.category?.name ?? null,
    requester: requesterLabel(ticket),
    assignee: ticket.assignee?.full_name ?? null,
    dueAt: ticket.due_at,
    createdAt: ticket.created_at,
    href: `/help-desk/${ticket.id}`,
  }
}

export const helpDeskAi: ModuleAi = {
  key: 'help_desk',
  description:
    'Help desk: ticket con stato, priorità, categoria, richiedente e assegnatario; conversazione; proposte di apertura, cambio stato, assegnazione e risposta.',
  examples: [
    'Quali ticket sono aperti e senza assegnatario?',
    'Rispondi al ticket HD-0003 che ce ne occupiamo domani',
  ],
  tools: ctx => {
    if (!hasLevel(ctx.access.help_desk, 'read')) return {}
    const read = {
      list_tickets: tool({
        description: 'Elenca i ticket che corrispondono ai filtri, al massimo 50, dal più recente.',
        inputSchema: z.object({
          status: z.array(z.enum(TICKET_STATUSES)).optional(),
          priority: z.array(z.enum(TICKET_PRIORITIES)).optional(),
          open: z.boolean().optional().describe('Solo aperti, in lavorazione o in attesa'),
          unassigned: z.boolean().optional(),
          mine: z.boolean().optional().describe('Solo i ticket assegnati alla persona che chiede'),
          overdue: z.boolean().optional(),
          q: z.string().max(80).optional().describe('Testo nel titolo, nel codice o nel richiedente'),
        }),
        execute: async input => {
          const rows = await listTickets({
            status: input.status,
            priority: input.priority,
            open: input.open,
            overdue: input.overdue,
            q: input.q,
            assigneeId: input.unassigned ? ['none'] : undefined,
            mine: input.mine ? ctx.profileId : undefined,
          })
          return { count: rows.length, tickets: rows.slice(0, 50).map(compact) }
        },
      }),
      get_ticket: tool({
        description: 'Il dettaglio di un ticket con gli ultimi messaggi della conversazione.',
        inputSchema: z.object({ id: uuidSchema }),
        execute: async ({ id }) => {
          const ticket = await getTicket(id)
          if (!ticket) return { found: false as const }
          return {
            found: true as const,
            ...compact(ticket),
            description: ticket.description,
            task: ticket.task ? { title: ticket.task.title, href: `/tasks/${ticket.task.id}` } : null,
            messages: ticket.messages.slice(-5).map(message => ({
              kind: message.kind,
              author: message.author?.full_name ?? null,
              body: message.body.slice(0, 500),
              at: message.created_at,
            })),
          }
        },
      }),
      ticket_kpis: tool({
        description:
          'I numeri del help desk: aperti, in lavorazione, in attesa, senza assegnatario, in ritardo, risolti negli ultimi 30 giorni.',
        inputSchema: z.object({}),
        execute: async () => getTicketKpis(),
      }),
    }
    if (!hasLevel(ctx.access.help_desk, 'write')) return read
    return {
      ...read,
      propose_create_ticket: proposalTool(
        'create_ticket',
        'Propone di aprire un ticket.',
        createTicketSchema,
        input => ({
          title: 'Apri ticket',
          summary: [
            `Titolo: ${input.title}`,
            input.priority ? `Priorità: ${TICKET_PRIORITY_LABEL[input.priority]}` : 'Priorità: Media',
          ],
        })
      ),
      propose_set_ticket_status: proposalTool(
        'set_ticket_status',
        'Propone di cambiare lo stato di un ticket.',
        setStatusSchema,
        input => ({
          title: 'Cambia stato ticket',
          summary: [`Nuovo stato: ${TICKET_STATUS_LABEL[input.status]}`],
        })
      ),
      propose_assign_ticket: proposalTool(
        'assign_ticket',
        'Propone di assegnare un ticket a una persona.',
        assignSchema,
        input => ({
          title: input.assigneeId ? 'Assegna ticket' : 'Togli assegnazione',
          summary: [
            input.assigneeId
              ? 'Il ticket passa alla persona indicata.'
              : 'Il ticket resta senza assegnatario.',
          ],
        })
      ),
      propose_reply_to_ticket: proposalTool(
        'reply_to_ticket',
        'Propone una risposta al richiedente o una nota interna sul ticket.',
        replySchema,
        input => ({
          title: input.kind === 'note' ? 'Aggiungi nota interna' : 'Rispondi al richiedente',
          summary: [input.body.length > 160 ? `${input.body.slice(0, 157)}…` : input.body],
        })
      ),
    }
  },
  proposals: {
    create_ticket: defineProposal({
      label: 'Apri ticket',
      schema: createTicketSchema,
      run: async input => {
        const result = await createTicket(input)
        return result.ok ? ok({ href: `/help-desk/${result.data.id}` }) : result
      },
    }),
    set_ticket_status: defineProposal({
      label: 'Cambia stato ticket',
      schema: setStatusSchema,
      run: async ({ id, status }) => {
        const result = await updateTicket(id, { status })
        return result.ok ? ok({ href: `/help-desk/${id}` }) : result
      },
    }),
    assign_ticket: defineProposal({
      label: 'Assegna ticket',
      schema: assignSchema,
      run: async ({ id, assigneeId }) => {
        const result = await updateTicket(id, { assigneeId })
        return result.ok ? ok({ href: `/help-desk/${id}` }) : result
      },
    }),
    reply_to_ticket: defineProposal({
      label: 'Rispondi al ticket',
      schema: replySchema,
      run: async ({ id, body, kind }) => {
        const result = await addTicketMessage({ ticketId: id, body, kind })
        return result.ok ? ok({ href: `/help-desk/${id}` }) : result
      },
    }),
  },
}
