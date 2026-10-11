import { InfoDot } from '@/components/ds/info-dot'
import { SetupWizard } from '@/components/assistant/setup-wizard'
import { UsageKpis } from '@/components/assistant/usage-kpis'
import { UsageTable } from '@/components/assistant/usage-table'
import { BackLink } from '@/components/ds/back-link'
import PageHeader from '@/components/ds/page-header'
import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import { requirePageAccess } from '@/lib/access/guard'
import { getAiUsage } from '@/lib/ai/queries'
import { getAiStatus } from '@/lib/ai/settings'
import { AI_PROVIDER_PRESETS, type AiStatus } from '@/lib/ai/types'
import { formatDateIt } from '@/lib/format-date'

/** The facts under the title: where the configuration comes from, never the key. */
function statusMeta(status: AiStatus) {
  if (!status.configured) return undefined
  const label = `${AI_PROVIDER_PRESETS[status.provider].label} · ${status.model}`
  if (status.source === 'env') return <span>Dalle variabili d’ambiente: {label}</span>
  const by = status.updatedByName ?? '—'
  return (
    <span>
      {label} · salvato da {by} il {formatDateIt(status.updatedAt)}
    </span>
  )
}

export default async function AssistantSetupPage() {
  await requirePageAccess('ai', 'admin')
  const [status, usage] = await Promise.all([getAiStatus(), getAiUsage()])

  return (
    <div className='space-y-6'>
      <BackLink href='/assistant'>Assistente</BackLink>
      <PageHeader
        title='Configurazione dell’assistente'
        description='Provider, modello e chiave. La chiave resta in Supabase Vault.'
        badges={
          status.configured ? (
            <StatusBadge tone='success' dot>
              Configurato
            </StatusBadge>
          ) : (
            <StatusBadge tone='warning' dot>
              Non configurato
            </StatusBadge>
          )
        }
        meta={statusMeta(status)}
      />
      <UsageKpis usage={usage} />
      <SetupWizard status={status} />
      <SectionCard
        title='Chiamate per modello'
        info={<InfoDot label='Informazioni'>{'Mese corrente.'}</InfoDot>}
      >
        <UsageTable rows={usage.byModel} />
      </SectionCard>
    </div>
  )
}
