import { Avviso } from '@/components/ds/avviso'
import { Classifica } from '@/components/ds/grafico-classifica'
import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import { categoryName } from '@/lib/civic/categories'
import { pm25Band } from '@/lib/civic/metrics'
import { formatDateIt } from '@/lib/format-date'
import { numeroIt, quotaIt } from '@/lib/format-number'
import type { ImpactReport as Report } from '@/lib/impatto/queries'

const ugm3 = (value: number | null) => (value === null ? '—' : `${numeroIt(value, { massimo: 1 })} µg/m³`)

/** The body of the printable impact report: numbers, air, data provenance and how to use it. */
export function ImpactReport({ report, caps }: { report: Report; caps: string[] }) {
  const band = pm25Band(report.air.pm25)
  return (
    <div className='space-y-6'>
      <p className='text-muted-foreground text-sm'>
        Dal {formatDateIt(report.from)} al {formatDateIt(report.to)} · CAP {caps.join(', ')}
      </p>
      <KpiGrid count={4}>
        <KpiCard
          title='Segnalazioni'
          value={report.reports.total}
          hint={`${report.reports.open} ancora aperte`}
        />
        <KpiCard
          title='Risolte'
          value={report.reports.resolved}
          tone='success'
          hint={`${quotaIt(report.reports.resolved, report.reports.total)} del totale`}
        />
        <KpiCard
          title='Tempo mediano di risoluzione'
          display={
            report.reports.medianResolutionDays === null
              ? '—'
              : numeroIt(report.reports.medianResolutionDays, { massimo: 1 })
          }
          suffix={report.reports.medianResolutionDays === null ? undefined : 'giorni'}
        />
        <KpiCard
          title='Missioni dei volontari'
          value={report.missions.verified}
          hint={
            report.missions.teamDays > 0
              ? `${numeroIt(report.missions.hours)} ore-persona · ${report.missions.teamDays} giornate del vostro team (${report.missions.people} persone)`
              : `${numeroIt(report.missions.hours)} ore-persona · ${numeroIt(report.missions.kg)} kg raccolti`
          }
        />
      </KpiGrid>

      <div className='grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-2'>
        <SectionCard title='Segnalazioni per categoria'>
          {report.reports.byCategory.length === 0 ? (
            <p className='text-muted-foreground text-sm'>Nessuna segnalazione nel periodo.</p>
          ) : (
            <Classifica
              voci={report.reports.byCategory.map(row => ({
                nome: categoryName(row.category),
                valore: row.count,
              }))}
            />
          )}
        </SectionCard>
        <SectionCard
          title='Qualità dell’aria'
          info='Ultima lettura dei POD nelle zone adottate, nelle ultime tre ore.'
        >
          {report.air.pods === 0 ? (
            <p className='text-muted-foreground text-sm'>Nessun POD attivo nelle zone adottate.</p>
          ) : (
            <PannelloScheda occhiello={`Media di ${report.air.pods} POD`}>
              <RigaDettaglio label='PM2.5'>
                <span className='inline-flex items-center gap-2'>
                  {ugm3(report.air.pm25)}
                  <StatusBadge tone={band.tone} variant='piatta'>
                    {band.label}
                  </StatusBadge>
                </span>
              </RigaDettaglio>
              <RigaDettaglio label='PM10'>{ugm3(report.air.pm10)}</RigaDettaglio>
              <RigaDettaglio label='NO₂'>{ugm3(report.air.no2)}</RigaDettaglio>
            </PannelloScheda>
          )}
        </SectionCard>
      </div>

      <SectionCard>
        <PannelloScheda occhiello='Provenienza dei dati'>
          <RigaDettaglio label='Cittadini'>
            {report.reports.fromCitizens} segnalazioni inviate dai cittadini con foto e posizione
          </RigaDettaglio>
          <RigaDettaglio label='POD'>
            {report.reports.fromPods} segnalazioni e le letture dell’aria dai sensori sul territorio
          </RigaDettaglio>
          <RigaDettaglio label='Verifica del Comune'>
            Le missioni contano solo dopo la verifica dello staff; la risoluzione è registrata dal Comune
          </RigaDettaglio>
          <RigaDettaglio label='Zone'>CAP assegnato in base alla posizione della segnalazione</RigaDettaglio>
        </PannelloScheda>
        {!report.missions.readable && (
          <p className='text-muted-foreground mt-3 text-xs'>
            Dati delle missioni non disponibili per questo account.
          </p>
        )}
      </SectionCard>

      <Avviso tono='info'>
        <p className='font-medium'>Come usare questo report</p>
        <p>
          Il report documenta un contributo alla comunità locale, utilizzabile nella rendicontazione
          volontaria VSME (informative B2 e C2, pratiche e iniziative verso la comunità). Non riduce né
          compensa l’impronta ambientale dell’azienda e non va presentato come compensazione di emissioni.
        </p>
      </Avviso>
    </div>
  )
}
