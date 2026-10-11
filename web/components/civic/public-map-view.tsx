'use client'

import { XIcon } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ReportMap } from '@/components/civic/report-map'
import { BottoneIcona } from '@/components/ds/bottone-icona'
import { Data } from '@/components/ds/data'
import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import { Button } from '@/components/ui/button'
import { categoryName, REPORT_STATUS, type ReportStatus } from '@/lib/civic/categories'
import { aqiBand, WEATHER } from '@/lib/civic/metrics'
import type { CityConditions, Station } from '@/lib/public/environment'
import type { PublicReport } from '@/lib/public/queries'

const STATUS_TONE: Record<string, 'warning' | 'info' | 'success' | 'muted'> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  rejected: 'muted',
}

/** The citizen home: open reports on the map, the weather pill that shows the sensors, one primary. */
export function PublicMapView({ initial }: { initial: PublicReport[] }) {
  const [reports, setReports] = useState(initial)
  const [selected, setSelected] = useState<string | null>(null)
  const [showSensors, setShowSensors] = useState(false)
  const [env, setEnv] = useState<{ city: CityConditions; stations: Station[] } | null>(null)

  const load = useCallback(async () => {
    const r = await fetch('/api/public/reports')
      .then(x => x.json())
      .catch(() => null)
    if (r?.reports) setReports(r.reports)
  }, [])

  useEffect(() => {
    const t = setInterval(load, 15000)
    fetch('/api/public/environment')
      .then(r => r.json())
      .then(setEnv)
      .catch(() => {})
    return () => clearInterval(t)
  }, [load])

  const report = useMemo(() => reports.find(r => r.id === selected) ?? null, [reports, selected])
  const band = aqiBand(env?.city?.european_aqi)

  return (
    <div className='relative min-h-[calc(100dvh-3.5rem)] flex-1'>
      <ReportMap
        reports={reports}
        stations={showSensors ? env?.stations : []}
        onSelect={setSelected}
        className='absolute inset-0'
      />

      <div className='absolute top-3 left-3 flex flex-col gap-2'>
        <Button
          variant='outline'
          size='sm'
          className='bg-background shadow-sm'
          onClick={() => setShowSensors(s => !s)}
        >
          {env?.city?.temperature_c != null ? `${Math.round(env.city.temperature_c)}°` : '—'} ·{' '}
          {WEATHER[env?.city?.weather_code ?? -1] ?? 'Meteo'} · Aria {band.label.toLowerCase()}
          <StatusBadge tone={showSensors ? 'success' : 'muted'} variant='badge'>
            {showSensors ? 'sensori visibili' : 'mostra sensori'}
          </StatusBadge>
        </Button>
      </div>

      <div className='absolute bottom-6 left-1/2 -translate-x-1/2'>
        <Button asChild size='lg' className='shadow-lg'>
          <Link href='/segnala'>Segnala un problema · {reports.length} aperti</Link>
        </Button>
      </div>

      {report && (
        <div className='absolute right-3 bottom-24 left-3 sm:bottom-6 sm:left-auto sm:w-96'>
          <SectionCard
            title={categoryName(report.category)}
            action={
              <BottoneIcona
                etichetta='Chiudi'
                icona={<XIcon />}
                variant='ghost'
                size='icon-sm'
                onClick={() => setSelected(null)}
              />
            }
          >
            <div className='space-y-3 text-sm'>
              {report.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={report.photo_url}
                  alt='Foto della segnalazione'
                  className='max-h-48 w-full rounded-md object-cover'
                />
              )}
              {report.description && <p className='text-muted-foreground'>{report.description}</p>}
              <div className='flex flex-wrap items-center gap-2'>
                <StatusBadge tone={STATUS_TONE[report.status] ?? 'muted'} dot>
                  {REPORT_STATUS[report.status as ReportStatus] ?? report.status}
                </StatusBadge>
                <span className='text-muted-foreground'>
                  CAP {report.cap} · <Data valore={report.created_at} forma='eta' />
                </span>
              </div>
              {report.observations > 1 && (
                <p className='text-muted-foreground text-xs'>Segnalato {report.observations} volte</p>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  )
}
