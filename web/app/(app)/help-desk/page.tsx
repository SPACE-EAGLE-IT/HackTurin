import Link from 'next/link'

import PageHeader from '@/components/ds/page-header'
import { NewTicketButton } from '@/components/help-desk/new-ticket-dialog'
import { TicketKpis } from '@/components/help-desk/ticket-kpis'
import { TicketTable } from '@/components/help-desk/ticket-table'
import { ListSurface } from '@/components/list-surface'
import { TicketToolbar } from '@/components/help-desk/ticket-toolbar'
import { Button } from '@/components/ui/button'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { requireSession } from '@/lib/auth/session'
import { getTicketKpis, listCategories, listTickets } from '@/lib/help-desk/queries'
import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type CategoryRef,
  type TicketFilters,
} from '@/lib/help-desk/types'
import { listPeople } from '@/lib/people/queries'
import { listProjects } from '@/lib/projects/queries'
import { enumListParam, firstParam, listParam, type SearchParams } from '@/lib/search-params'
import type { ProjectRef } from '@/lib/tasks/types'

// Ids go into a PostgREST `in`/`or` filter as text: only uuids (and the `none` marker) pass.
const UUID = /^[0-9a-f-]{36}$/i
const ID_OR_NONE = /^(none|[0-9a-f-]{36})$/i

export default async function HelpDeskPage(props: { searchParams: Promise<SearchParams> }) {
  await requirePageAccess('help_desk')
  const [params, session] = await Promise.all([props.searchParams, requireSession()])

  const filters: TicketFilters = {
    q: firstParam(params, 'q')?.trim() || undefined,
    status: enumListParam(params, 'stato', TICKET_STATUSES),
    priority: enumListParam(params, 'priorita', TICKET_PRIORITIES),
    categoryId: listParam(params, 'categoria').filter(value => UUID.test(value)),
    assigneeId: listParam(params, 'persona').filter(value => ID_OR_NONE.test(value)),
    mine: firstParam(params, 'miei') === '1' ? session.profile.id : undefined,
    overdue: firstParam(params, 'scaduti') === '1' ? true : undefined,
  }

  const [tickets, kpis, categories, people, projects, canWrite, isAdmin] = await Promise.all([
    listTickets(filters),
    getTicketKpis(),
    listCategories(),
    listPeople(),
    listProjects(),
    can('help_desk', 'write'),
    can('help_desk', 'admin'),
  ])
  const categoryRefs: CategoryRef[] = categories.map(({ id, name }) => ({ id, name }))
  const projectRefs: ProjectRef[] = projects.map(({ id, code, name }) => ({ id, code, name }))

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Help desk'
        description='Richieste, problemi e domande, con la loro conversazione.'
        actions={
          isAdmin || canWrite ? (
            <>
              {isAdmin && (
                <Button variant='outline' asChild>
                  <Link href='/help-desk/settings'>Impostazioni</Link>
                </Button>
              )}
              {canWrite && (
                <NewTicketButton categories={categoryRefs} people={people} projects={projectRefs} />
              )}
            </>
          ) : undefined
        }
      />
      <TicketKpis kpis={kpis} />
      <div className='space-y-4'>
        <ListSurface
          toolbar={<TicketToolbar categories={categoryRefs} people={people} resultCount={tickets.length} />}
        >
          <TicketTable tickets={tickets} cornice={false} />
        </ListSurface>
      </div>
    </div>
  )
}
