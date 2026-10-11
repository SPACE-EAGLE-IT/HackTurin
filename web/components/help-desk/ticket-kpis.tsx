'use client'

import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import { OPEN_TICKET_STATUSES, type TicketKpis as TicketKpiValues } from '@/lib/help-desk/types'
import { useUrlState } from '@/lib/url-state'

const OPEN = OPEN_TICKET_STATUSES.join(',')
const DONE = 'resolved,closed'

/** The four numbers above the list; each tile is a handle that rewrites the URL filters. */
export function TicketKpis({ kpis }: { kpis: TicketKpiValues }) {
  const { get, getList, setMany } = useUrlState()
  const stato = sortedKey(getList('stato'))
  const persona = get('persona')
  const scaduti = get('scaduti') === '1'

  const isOpen = stato === sortedKey(OPEN.split(','))
  const isDone = stato === sortedKey(DONE.split(','))

  return (
    <KpiGrid count={4}>
      <KpiCard
        title='Aperti'
        value={kpis.open}
        onClick={() => setMany({ stato: OPEN, persona: null, scaduti: null })}
        active={isOpen && !persona && !scaduti}
      />
      <KpiCard
        title='Senza assegnatario'
        value={kpis.unassigned}
        tone={kpis.unassigned > 0 ? 'warning' : 'default'}
        onClick={() => setMany({ persona: 'none', stato: OPEN, scaduti: null })}
        active={isOpen && persona === 'none' && !scaduti}
      />
      <KpiCard
        title='In ritardo'
        value={kpis.overdue}
        tone={kpis.overdue > 0 ? 'destructive' : 'default'}
        onClick={() => setMany({ scaduti: '1', stato: null, persona: null })}
        active={scaduti && !stato && !persona}
      />
      <KpiCard
        title='Risolti in 30 giorni'
        value={kpis.resolvedLast30Days}
        tone='success'
        onClick={() => setMany({ stato: DONE, persona: null, scaduti: null })}
        active={isDone && !persona && !scaduti}
      />
    </KpiGrid>
  )
}

// The order of a comma list in the URL does not matter: compare the sorted set.
function sortedKey(values: readonly string[]) {
  return [...values].sort().join(',')
}
