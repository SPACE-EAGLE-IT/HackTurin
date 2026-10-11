'use client'

import { TicketComposer } from '@/components/help-desk/ticket-composer'
import { TicketProperties } from '@/components/help-desk/ticket-properties'
import { TicketThread } from '@/components/help-desk/ticket-thread'
import type { TicketCategory, TicketDetail as TicketDetailData } from '@/lib/help-desk/types'
import type { PersonRef, ProjectRef } from '@/lib/tasks/types'

/** The body of a ticket: the conversation on the left, the properties on the right. */
export function TicketDetail({
  ticket,
  categories,
  people,
  projects,
  canWrite,
  currentProfileId,
}: {
  ticket: TicketDetailData
  categories: TicketCategory[]
  people: PersonRef[]
  projects: ProjectRef[]
  canWrite: boolean
  currentProfileId: string
}) {
  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]'>
      <div className='space-y-6'>
        <TicketThread ticket={ticket} currentProfileId={currentProfileId} canWrite={canWrite} />
        <TicketComposer ticketId={ticket.id} status={ticket.status} canWrite={canWrite} />
      </div>
      <TicketProperties
        ticket={ticket}
        categories={categories}
        people={people}
        projects={projects}
        canWrite={canWrite}
      />
    </div>
  )
}
