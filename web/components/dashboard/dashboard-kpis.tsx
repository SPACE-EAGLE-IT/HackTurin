'use client'

import { useRouter } from 'next/navigation'

import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import type { TaskKpis } from '@/lib/tasks/types'

/** The four handles of the dashboard: each tile opens the task list already filtered. */
export function DashboardKpis({ kpis }: { kpis: TaskKpis }) {
  const router = useRouter()

  return (
    <KpiGrid count={4}>
      <KpiCard title='Aperte' value={kpis.open} onClick={() => router.push('/tasks')} />
      <KpiCard
        title='Entro 7 giorni'
        value={kpis.dueThisWeek}
        tone={kpis.dueThisWeek > 0 ? 'warning' : 'default'}
        onClick={() => router.push('/tasks?scadenza=week')}
      />
      <KpiCard
        title='In ritardo'
        value={kpis.overdue}
        tone={kpis.overdue > 0 ? 'destructive' : 'default'}
        onClick={() => router.push('/tasks?scadenza=overdue')}
      />
      <KpiCard
        title='Fatte in 30 giorni'
        value={kpis.doneLast30Days}
        tone='success'
        onClick={() => router.push('/tasks?stato=done')}
      />
    </KpiGrid>
  )
}
