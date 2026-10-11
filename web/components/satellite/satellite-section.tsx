'use client'

import { useEffect, useState } from 'react'

import { InfoDot } from '@/components/ds/info-dot'
import { Avviso } from '@/components/ds/avviso'
import { Classifica } from '@/components/ds/grafico-classifica'
import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import { SectionCard } from '@/components/ds/section-card'
import { Skeleton } from '@/components/ui/skeleton'
import { greenBand, greenIndex } from '@/lib/satellite/green'
import { AOT_MIN_SPREAD, aotLevel } from '@/lib/satellite/indices'
import type { SatelliteResult } from '@/lib/satellite/sentinel'

const dateIt = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })

/** «Dallo spazio»: haze (AOT) and green cover (NDVI) per CAP from the latest clear Sentinel-2 scene. */
export function SatelliteSection() {
  const [data, setData] = useState<SatelliteResult | null>(null)

  useEffect(() => {
    const ctl = new AbortController()
    fetch('/api/public/satellite', { signal: ctl.signal })
      .then(r => r.json())
      .then(setData)
      .catch(() => setData({ available: false, reason: 'network' }))
    return () => ctl.abort()
  }, [])

  return (
    <SectionCard
      title='Dallo spazio · Sentinel-2'
      info={
        <InfoDot label='Informazioni'>
          {
            'Immagini gratuite del programma europeo Copernicus, risoluzione 10–20 m, un passaggio ogni pochi giorni.'
          }
        </InfoDot>
      }
    >
      {!data ? (
        <div className='space-y-3'>
          <Skeleton className='h-20 w-full' />
          <Skeleton className='h-40 w-full' />
        </div>
      ) : !data.available ? (
        <Avviso tono='info'>
          Nessuna immagine satellitare senza nuvole sulla città negli ultimi giorni: riprova più tardi.
        </Avviso>
      ) : (
        <Body data={data} />
      )}
    </SectionCard>
  )
}

function Body({ data }: { data: Extract<SatelliteResult, { available: true }> }) {
  const aots = data.zones.map(z => z.aot)
  const cityAot = aots.reduce((s, v) => s + v, 0) / Math.max(1, aots.length)
  const uniform = Math.max(...aots) - Math.min(...aots) < AOT_MIN_SPREAD
  const year = data.datetime.slice(0, 4)
  const leastGreen = [...data.zones]
    .filter(z => z.ndvi != null)
    .sort((a, b) => (a.ndvi ?? 0) - (b.ndvi ?? 0))
    .slice(0, 10)

  return (
    <div className='space-y-4'>
      <KpiGrid count={4}>
        <KpiCard
          title='Foschia sulla città'
          display={aotLevel(cityAot)}
          hint={`AOT 550 nm ${cityAot.toFixed(2)}`}
        />
        <KpiCard
          title='Zone poco verdi'
          value={data.zones.filter(z => greenBand(z.ndvi).tone === 'warning').length}
          hint={`su ${data.zones.length} CAP analizzati`}
          tone='warning'
        />
        <KpiCard
          title='Immagine del'
          display={dateIt(data.datetime)}
          hint={`Nuvole ${Math.round(data.cloudCover)}%`}
        />
        <KpiCard
          title='Meno verde'
          display={leastGreen[0] ? `CAP ${leastGreen[0].cap}` : '—'}
          hint={leastGreen[0] ? `Indice verde ${greenIndex(leastGreen[0].ndvi)}` : undefined}
        />
      </KpiGrid>
      <div className='grid gap-4 lg:grid-cols-2'>
        <div className='space-y-2'>
          <p className='text-sm font-medium'>Le 10 zone meno verdi (indice verde, NDVI × 100)</p>
          <Classifica
            voci={leastGreen.map(z => ({ nome: `CAP ${z.cap}`, valore: greenIndex(z.ndvi) }))}
            conQuota={false}
          />
        </div>
        <div className='space-y-2'>
          <p className='text-sm font-medium'>Foschia (aerosol) per CAP</p>
          {uniform ? (
            <Avviso tono='info'>
              {`In questa immagine la foschia è uniforme su tutta la città (${aotLevel(cityAot).toLowerCase()}): il satellite non distingue differenze fra quartieri.`}
            </Avviso>
          ) : (
            <Classifica
              voci={data.zones.map(z => ({ nome: `CAP ${z.cap}`, valore: Math.round(z.aot * 1000) / 1000 }))}
              conQuota={false}
            />
          )}
        </div>
      </div>
      <Avviso tono='warning'>
        Stime da satellite, non misure ufficiali della qualità dell’aria. L’AOT misura le particelle che
        velano la luce in tutta la colonna d’aria; l’NDVI misura la vegetazione, che aiuta contro calore e
        polveri. I gas come l’NO₂ non si vedono con Sentinel-2: per quelli servono Sentinel-5P e le centraline
        ARPA.
      </Avviso>
      <p className='text-muted-foreground text-xs'>
        {`Contiene dati Copernicus Sentinel modificati ${year}. Scena ${data.sceneId}, via `}
        <a href={data.source} target='_blank' rel='noreferrer' className='underline underline-offset-4'>
          Earth Search (AWS Open Data)
        </a>
        .
      </p>
    </div>
  )
}
