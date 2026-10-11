'use client'

import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import { euro, MONTHLY_CAP, type MissionKpis as Values, type MissionTab } from '@/lib/missioni/types'
import { useUrlState } from '@/lib/url-state'

/** The four numbers above the list; the mission tiles switch the tab below. */
export function MissionKpis({ kpis, tab }: { kpis: Values; tab: MissionTab }) {
  const { set } = useUrlState()
  const left = Math.max(0, MONTHLY_CAP - kpis.monthSelfCertified)

  return (
    <KpiGrid count={4}>
      <KpiCard
        title='Missioni aperte'
        value={kpis.open}
        onClick={() => set('tab', null)}
        active={tab === 'disponibili'}
      />
      <KpiCard
        title='Mie in corso'
        value={kpis.mineInProgress}
        tone={kpis.mineInProgress > 0 ? 'info' : 'default'}
        onClick={() => set('tab', 'mie')}
        active={tab === 'mie'}
      />
      <KpiCard
        title='Completate'
        value={kpis.mineVerified}
        tone='success'
        onClick={() => set('tab', 'mie')}
      />
      <KpiCard
        title='Rimborsi del mese'
        display={euro(kpis.monthExpenses)}
        hint={`Restano ${euro(left)} autocertificabili su ${euro(MONTHLY_CAP)}`}
        tone={left <= 0 ? 'warning' : 'default'}
      />
    </KpiGrid>
  )
}
