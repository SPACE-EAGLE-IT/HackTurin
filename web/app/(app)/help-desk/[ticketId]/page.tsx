import { notFound } from 'next/navigation'

import { BackLink } from '@/components/ds/back-link'
import { Data } from '@/components/ds/data'
import PageHeader from '@/components/ds/page-header'
import { TicketActions } from '@/components/help-desk/ticket-actions'
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/help-desk/ticket-badges'
import { TicketDetail } from '@/components/help-desk/ticket-detail'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { requireSession } from '@/lib/auth/session'
import { getTicket, listCategories } from '@/lib/help-desk/queries'
import { requesterLabel } from '@/lib/help-desk/types'
import { listPeople } from '@/lib/people/queries'
import { listProjects } from '@/lib/projects/queries'
import type { ProjectRef } from '@/lib/tasks/types'
import { uuidSchema } from '@/lib/validation'

export default async function TicketPage(props: { params: Promise<{ ticketId: string }> }) {
  await requirePageAccess('help_desk')
  const { ticketId } = await props.params
  // A malformed id is "not found", not a database error.
  if (!uuidSchema.safeParse(ticketId).success) notFound()

  const [ticket, categories, people, projects, session, canWrite] = await Promise.all([
    getTicket(ticketId),
    listCategories({ includeInactive: true }),
    listPeople(),
    listProjects(),
    requireSession(),
    can('help_desk', 'write'),
  ])
  if (!ticket) notFound()

  const projectRefs: ProjectRef[] = projects.map(({ id, code, name }) => ({ id, code, name }))

  return (
    <div className='space-y-6'>
      <BackLink href='/help-desk'>Tutti i ticket</BackLink>
      <PageHeader
        title={`${ticket.code} · ${ticket.title}`}
        badges={
          <>
            <TicketStatusBadge status={ticket.status} />
            <TicketPriorityBadge priority={ticket.priority} />
          </>
        }
        meta={
          <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
            {ticket.category && (
              <>
                <span>{ticket.category.name}</span>
                <span aria-hidden>·</span>
              </>
            )}
            <span>Richiesto da {requesterLabel(ticket)}</span>
            <span aria-hidden>·</span>
            <span>{ticket.assignee ? `Assegnato a ${ticket.assignee.full_name}` : 'Non assegnato'}</span>
            {ticket.due_at && (
              <>
                <span aria-hidden>·</span>
                <span>
                  Scadenza <Data valore={ticket.due_at} forma='corta' />
                </span>
              </>
            )}
          </div>
        }
        actions={
          canWrite ? (
            <TicketActions
              ticket={{
                id: ticket.id,
                status: ticket.status,
                assignee_id: ticket.assignee_id,
                task_id: ticket.task_id,
              }}
              currentProfileId={session.profile.id}
            />
          ) : undefined
        }
      />
      <TicketDetail
        ticket={ticket}
        categories={categories}
        people={people}
        projects={projectRefs}
        canWrite={canWrite}
        currentProfileId={session.profile.id}
      />
    </div>
  )
}
