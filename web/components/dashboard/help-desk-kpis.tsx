'use client'

import { useRouter } from 'next/navigation'

import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import type { TicketKpis } from '@/lib/help-desk/types'

/** Three handles into the Help desk, each opening the ticket list already filtered. */
export function HelpDeskKpis({ kpis }: { kpis: TicketKpis }) {
  const router = useRouter()

  return (
    <KpiGrid count={3} contenitore>
      <KpiCard
        title='Ticket aperti'
        value={kpis.open}
        onClick={() => router.push('/help-desk?stato=open,in_progress,waiting')}
      />
      <KpiCard
        title='Senza assegnatario'
        value={kpis.unassigned}
        tone={kpis.unassigned > 0 ? 'warning' : 'default'}
        onClick={() => router.push('/help-desk?persona=none&stato=open,in_progress,waiting')}
      />
      <KpiCard
        title='In ritardo'
        value={kpis.overdue}
        tone={kpis.overdue > 0 ? 'destructive' : 'default'}
        onClick={() => router.push('/help-desk?scaduti=1')}
      />
    </KpiGrid>
  )
}
