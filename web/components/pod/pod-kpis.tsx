'use client'

import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import type { PodTraffic } from '@/lib/pod/types'
import { useUrlState } from '@/lib/url-state'

/** The four numbers above the list; the error tiles narrow the traffic log to errors. */
export function PodKpis({ traffic }: { traffic: PodTraffic }) {
  const { get, set } = useUrlState()
  const errori = get('errori') === '1'
  const offline = traffic.total - traffic.online

  return (
    <KpiGrid count={4}>
      <KpiCard
        title='POD online'
        display={`${traffic.online}/${traffic.total}`}
        tone={traffic.total > 0 && offline === 0 ? 'success' : offline > 0 ? 'warning' : 'default'}
      />
      <KpiCard
        title='Richieste 24h'
        value={traffic.requests24h}
        onClick={() => set('errori', null)}
        active={!errori}
      />
      <KpiCard
        title='Errori 24h'
        value={traffic.errors24h}
        tone={traffic.errors24h > 0 ? 'destructive' : 'default'}
        onClick={() => set('errori', '1')}
        active={errori}
      />
      <KpiCard
        title='Chiavi rifiutate 24h'
        value={traffic.rejected24h}
        tone={traffic.rejected24h > 0 ? 'warning' : 'default'}
        onClick={() => set('errori', '1')}
      />
    </KpiGrid>
  )
}
