import { EnvironmentCard } from '@/components/civic/environment-card'
import { ReportsTrend } from '@/components/civic/stats-charts'
import { Classifica } from '@/components/ds/grafico-classifica'
import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import PageHeader from '@/components/ds/page-header'
import { SectionCard } from '@/components/ds/section-card'
import { SatelliteSection } from '@/components/satellite/satellite-section'
import { categoryName } from '@/lib/civic/categories'
import { environment } from '@/lib/public/environment'
import { publicStats } from '@/lib/public/queries'

export const metadata = { title: 'Statistiche' }
export const revalidate = 60

export default async function StatistichePage() {
  const [s, env] = await Promise.all([publicStats(), environment()])
  return (
    <div className='mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6'>
      <PageHeader
        title='Come sta Torino'
        description='Segnalazioni, decoro urbano e qualità dell’aria, aggiornati di continuo.'
      />
      <KpiGrid count={4}>
        <KpiCard
          title='Problemi aperti'
          value={s.totals.open}
          hint={`${s.totals.all} segnalati in totale`}
          tone='warning'
        />
        <KpiCard title='Risolti' value={s.totals.resolved} tone='success' />
        <KpiCard
          title='Tempo medio di risoluzione'
          display={s.totals.avgResolutionHours != null ? `${s.totals.avgResolutionHours.toFixed(1)} h` : '—'}
        />
        <KpiCard
          title='Rilevati dai POD'
          value={s.totals.fromPods}
          hint={`${s.fleet.online} di ${s.fleet.total} POD online`}
          tone='info'
        />
      </KpiGrid>
      <EnvironmentCard city={env.city} stations={env.stations} />
      <SatelliteSection />
      <ReportsTrend data={s.byDay} />
      <div className='grid gap-4 lg:grid-cols-2'>
        <SectionCard title='Per categoria'>
          <Classifica voci={s.byCategory.map(c => ({ nome: categoryName(c.slug), valore: c.total }))} />
        </SectionCard>
        <SectionCard title='Zone con più problemi aperti' info='CAP stimato dal centroide più vicino.'>
          <Classifica
            voci={s.byCap.slice(0, 10).map(c => ({ nome: `CAP ${c.cap}`, valore: c.open }))}
            conQuota={false}
          />
        </SectionCard>
      </div>
      <SectionCard
        title='Il fondo dei volontari'
        info='Donazioni all’associazione partner: coprono rimborsi spese e materiali.'
      >
        <KpiGrid count={4}>
          <KpiCard title='Raccolti' display={`${Number(s.fund.raised).toLocaleString('it-IT')} €`} />
          <KpiCard title='Missioni completate' value={s.fund.missions_verified} />
          <KpiCard title='Ore di volontariato' value={Number(s.fund.volunteer_hours)} />
          <KpiCard title='Zone adottate da aziende' value={s.fund.zones_adopted} />
        </KpiGrid>
      </SectionCard>
    </div>
  )
}
