import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import type { AiUsage } from '@/lib/ai/types'
import { formatEtaIt } from '@/lib/format-date'
import { numeroIt } from '@/lib/format-number'

/** The month at a glance. Plain tiles: nothing to filter below. */
export function UsageKpis({ usage }: { usage: AiUsage }) {
  return (
    <KpiGrid count={4}>
      <KpiCard title='Chiamate nel mese' value={usage.calls} />
      <KpiCard title='Token in ingresso' display={numeroIt(usage.inputTokens)} />
      <KpiCard title='Token in uscita' display={numeroIt(usage.outputTokens)} />
      <KpiCard title='Ultima chiamata' display={usage.lastCallAt ? formatEtaIt(usage.lastCallAt) : '—'} />
    </KpiGrid>
  )
}
