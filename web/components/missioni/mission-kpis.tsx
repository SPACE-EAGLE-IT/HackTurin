'use client'

import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import { numeroIt } from '@/lib/format-number'
import {
  euro,
  MONTHLY_CAP,
  type MissionKpis as Values,
  type MissionTab,
  volunteerLevel,
} from '@/lib/missioni/types'
import { useUrlState } from '@/lib/url-state'

/** The four numbers above the list; the mission tiles switch the tab below. */
export function MissionKpis({ kpis, tab }: { kpis: Values; tab: MissionTab }) {
  const { set } = useUrlState()
  const left = Math.max(0, MONTHLY_CAP - kpis.monthSelfCertified)
  const level = volunteerLevel(kpis.mineHours)

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
        title='Ore verificate'
        display={numeroIt(kpis.mineHours)}
        suffix='h'
        tone='success'
        hint={
          level.next
            ? `${level.label} · ${numeroIt(level.next.hoursLeft)} h a «${level.next.label}»`
            : level.label
        }
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
