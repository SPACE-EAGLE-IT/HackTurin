'use client'

import { DownloadIcon } from 'lucide-react'

import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { euro, type FundKpis as Values, type FundTab } from '@/lib/fondo/types'
import { useUrlState } from '@/lib/url-state'

/** The four numbers of the fund; tiles switch the tab below. */
export function FundKpis({ kpis, tab }: { kpis: Values; tab: FundTab }) {
  const { set } = useUrlState()
  return (
    <KpiGrid count={4}>
      <KpiCard
        title='Raccolti'
        display={euro(kpis.raised)}
        hint={`${kpis.donors} donazioni`}
        onClick={() => set('tab', 'donazioni')}
        active={tab === 'donazioni'}
      />
      <KpiCard title='Rimborsati' display={euro(kpis.reimbursed)} tone='success' />
      <KpiCard
        title='Da rimborsare'
        display={euro(kpis.toReimburse)}
        tone={kpis.toReimburse > 0 ? 'warning' : 'default'}
        onClick={() => set('tab', null)}
        active={tab === 'rimborsi'}
      />
      <KpiCard
        title='Zone adottate'
        value={kpis.zonesAdopted}
        onClick={() => set('tab', 'adozioni')}
        active={tab === 'adozioni'}
      />
    </KpiGrid>
  )
}

export function FundTabs({ tab }: { tab: FundTab }) {
  const { set } = useUrlState()
  return (
    <Tabs value={tab} onValueChange={value => set('tab', value === 'rimborsi' ? null : value)}>
      <TabsList variant='line'>
        <TabsTrigger value='rimborsi'>Rimborsi da pagare</TabsTrigger>
        <TabsTrigger value='donazioni'>Donazioni</TabsTrigger>
        <TabsTrigger value='adozioni'>Adozioni</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

export function DownloadCsvButton() {
  return (
    <Button variant='outline' asChild>
      <a href='/api/fondo/rimborsi' download>
        <DownloadIcon /> Scarica CSV
      </a>
    </Button>
  )
}
