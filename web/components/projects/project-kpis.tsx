'use client'

import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import { PROJECT_STATUSES, type ProjectStatus } from '@/lib/projects/types'
import { useUrlState } from '@/lib/url-state'

// Plural titles: the tiles count projects, the badges name one.
const KPI_TITLE: Record<ProjectStatus, string> = { active: 'Attive', paused: 'In pausa', closed: 'Chiuse' }

export function ProjectKpis({ counts }: { counts: Record<ProjectStatus, number> }) {
  const { getList, set } = useUrlState()
  const selected = getList('stato')
  const isOnly = (status: ProjectStatus) => selected.length === 1 && selected[0] === status

  return (
    <KpiGrid count={3}>
      {PROJECT_STATUSES.map(status => (
        <KpiCard
          key={status}
          title={KPI_TITLE[status]}
          value={counts[status]}
          active={isOnly(status)}
          onClick={() => set('stato', isOnly(status) ? null : status)}
        />
      ))}
    </KpiGrid>
  )
}
