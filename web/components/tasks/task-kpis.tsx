'use client'

import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import type { TaskKpis as TaskKpiValues } from '@/lib/tasks/types'
import { useUrlState } from '@/lib/url-state'

/** The four numbers above the list; each tile is a handle that rewrites the URL filters. */
export function TaskKpis({ kpis }: { kpis: TaskKpiValues }) {
  const { get, setMany } = useUrlState()
  const stato = get('stato')
  const scadenza = get('scadenza')

  return (
    <KpiGrid count={4}>
      <KpiCard
        title='Aperte'
        value={kpis.open}
        onClick={() => setMany({ stato: null, scadenza: null })}
        active={!stato && !scadenza}
      />
      <KpiCard
        title='Entro 7 giorni'
        value={kpis.dueThisWeek}
        tone={kpis.dueThisWeek > 0 ? 'warning' : 'default'}
        onClick={() => setMany({ scadenza: 'week', stato: null })}
        active={scadenza === 'week' && !stato}
      />
      <KpiCard
        title='In ritardo'
        value={kpis.overdue}
        tone={kpis.overdue > 0 ? 'destructive' : 'default'}
        onClick={() => setMany({ scadenza: 'overdue', stato: null })}
        active={scadenza === 'overdue' && !stato}
      />
      <KpiCard
        title='Fatte in 30 giorni'
        value={kpis.doneLast30Days}
        tone='success'
        onClick={() => setMany({ stato: 'done', scadenza: null })}
        active={stato === 'done' && !scadenza}
      />
    </KpiGrid>
  )
}
