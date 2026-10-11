'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import maplibregl from 'maplibre-gl'
import { RouteIcon, TruckIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { InfoDot } from '@/components/ds/info-dot'
import { tokenColor } from '@/components/civic/token-color'
import { EmptyState } from '@/components/ds/empty-state'
import { DateTrigger, PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { NumberField } from '@/components/ds/number-field'
import { Scelta } from '@/components/ds/scelta'
import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { categoryName, TORINO_CENTER } from '@/lib/civic/categories'
import { solveTour, splitStops, tourLength, tourStats, type Stop } from '@/lib/civic/optimize'
import { todayKey } from '@/lib/date-keys'
import { eseguiConEsito } from '@/lib/esegui-con-esito'
import { SERIE } from '@/lib/grafici-geometria'
import { assignRoute } from '@/lib/tasks/actions'
import type { PersonRef } from '@/lib/tasks/types'

export type RoutableTask = Stop & { title: string; category: string }
type Route = {
  stops: RoutableTask[]
  line: [number, number][]
  km: number
  minutes: number
  saved: number
  road: boolean
}

/** Road geometry from the public OSRM server; straight lines when it does not answer. */
async function roadLine(points: [number, number][]) {
  try {
    const path = points.map(p => p.join(',')).join(';')
    const r = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${path}?overview=full&geometries=geojson`,
      {
        signal: AbortSignal.timeout(6000),
      }
    )
    const j = await r.json()
    if (j.code === 'Ok')
      return {
        line: j.routes[0].geometry.coordinates as [number, number][],
        km: j.routes[0].distance / 1000,
        min: j.routes[0].duration / 60,
      }
  } catch {
    // fall back to straight segments
  }
  return null
}

export function RoutePlanner({ tasks, people }: { tasks: RoutableTask[]; people: PersonRef[] }) {
  const router = useRouter()
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const overlays = useRef<maplibregl.Marker[]>([])
  const { resolvedTheme } = useTheme()
  const [depot, setDepot] = useState<[number, number]>(TORINO_CENTER)
  const [crews, setCrews] = useState<number | null>(2)
  const [routes, setRoutes] = useState<Route[]>([])
  const [assignees, setAssignees] = useState<Record<number, string | null>>({})
  const [day, setDay] = useState<string | undefined>(todayKey())
  const [computing, setComputing] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!el.current) return
    const m = new maplibregl.Map({
      container: el.current,
      style: `https://basemaps.cartocdn.com/gl/${resolvedTheme === 'dark' ? 'dark-matter' : 'positron'}-gl-style/style.json`,
      center: TORINO_CENTER,
      zoom: 11.6,
      attributionControl: { compact: true },
    })
    m.on('click', e => setDepot([e.lngLat.lng, e.lngLat.lat]))
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [resolvedTheme])

  // Draw depot, stops and routes.
  useEffect(() => {
    const m = map.current
    if (!m) return
    const draw = () => {
      overlays.current.forEach(x => x.remove())
      overlays.current = []
      for (let i = 0; i < 8; i++) {
        if (m.getLayer(`r${i}`)) m.removeLayer(`r${i}`)
        if (m.getSource(`r${i}`)) m.removeSource(`r${i}`)
      }
      const home = document.createElement('div')
      home.className = 'size-4 rounded-sm bg-foreground ring-2 ring-background'
      overlays.current.push(new maplibregl.Marker({ element: home }).setLngLat(depot).addTo(m))
      const routed = new Set(routes.flatMap(r => r.stops.map(s => s.id)))
      for (const t of tasks.filter(t => !routed.has(t.id))) {
        const dot = document.createElement('div')
        dot.className = 'size-2.5 rounded-full bg-muted-foreground ring-2 ring-background'
        overlays.current.push(new maplibregl.Marker({ element: dot }).setLngLat([t.lon, t.lat]).addTo(m))
      }
      routes.forEach((r, i) => {
        const colour = SERIE[i % SERIE.length]
        m.addSource(`r${i}`, {
          type: 'geojson',
          data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: r.line } },
        })
        m.addLayer({
          id: `r${i}`,
          type: 'line',
          source: `r${i}`,
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-width': 4, 'line-color': tokenColor(colour.slice(4, -1)) },
        })
        r.stops.forEach((s, k) => {
          const n = document.createElement('div')
          n.className =
            'grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-2 ring-background'
          n.textContent = String(k + 1)
          overlays.current.push(new maplibregl.Marker({ element: n }).setLngLat([s.lon, s.lat]).addTo(m))
        })
      })
    }
    if (m.isStyleLoaded()) draw()
    else m.once('load', draw)
  }, [tasks, routes, depot])

  const compute = async () => {
    setComputing(true)
    const groups = splitStops(depot, tasks, Math.max(1, crews ?? 1))
    const next: Route[] = []
    for (const g of groups) {
      const order = solveTour(depot, g) as RoutableTask[]
      const naive = tourLength(depot, g)
      const stats = tourStats(depot, order)
      const road = await roadLine([depot, ...order.map((s): [number, number] => [s.lon, s.lat]), depot])
      next.push({
        stops: order,
        line: road?.line ?? [depot, ...order.map((s): [number, number] => [s.lon, s.lat]), depot],
        km: road?.km ?? stats.km,
        minutes: (road?.min ?? stats.minutes - order.length * 4) + order.length * 4,
        saved: naive > 0 ? Math.max(0, Math.round((1 - tourLength(depot, order) / naive) * 100)) : 0,
        road: Boolean(road),
      })
    }
    setRoutes(next)
    setComputing(false)
  }

  const assign = (i: number) =>
    startTransition(() =>
      eseguiConEsito(
        assignRoute({ taskIds: routes[i].stops.map(s => s.id), assigneeId: assignees[i], dueDate: day }),
        r => {
          if (!r.ok) return void toast.error(r.message)
          toast.success('Giro assegnato')
          router.refresh()
        }
      )
    )

  if (tasks.length === 0) {
    return (
      <SectionCard>
        <EmptyState
          icon={RouteIcon}
          title='Nessun intervento da pianificare'
          description='Crea interventi dalle segnalazioni per pianificare i giri.'
        />
      </SectionCard>
    )
  }

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]'>
      <SectionCard
        title='Mappa'
        info={
          <InfoDot label='Informazioni'>{'Tocca la mappa per spostare il deposito di partenza.'}</InfoDot>
        }
      >
        <div ref={el} className='h-[60vh] min-h-96 overflow-hidden rounded-md' />
      </SectionCard>
      <div className='space-y-6'>
        <SectionCard title='Pianifica'>
          <FormGrid>
            <PropertyField label='Squadre'>
              <NumberField value={crews} onValueChange={setCrews} placeholder='2' />
            </PropertyField>
            <PropertyField label='Giorno'>
              <DateTrigger value={day} onChange={setDay} placeholder='Oggi' />
            </PropertyField>
          </FormGrid>
          <p className='text-muted-foreground mt-3 text-xs'>
            {tasks.length} interventi aperti con posizione.
          </p>
          <div className='mt-4 flex justify-end'>
            <Button onClick={compute} disabled={computing}>
              {computing && <Spinner />} Calcola giri
            </Button>
          </div>
        </SectionCard>
        {routes.map((r, i) => (
          <SectionCard
            key={i}
            title={`Squadra ${i + 1}`}
            action={
              <StatusBadge
                tone='info'
                variant='piatta'
              >{`${r.km.toFixed(1)} km · ${Math.round(r.minutes)} min`}</StatusBadge>
            }
          >
            <div className='space-y-3 text-sm'>
              <p className='text-muted-foreground'>
                <TruckIcon className='mr-1 inline size-4' />
                {r.stops.length} tappe{r.saved > 0 ? ` · −${r.saved}% di strada` : ''} ·{' '}
                {r.road ? 'percorso stradale' : 'stima in linea d’aria'}
              </p>
              <ol className='list-decimal space-y-0.5 pl-5'>
                {r.stops.map(s => (
                  <li key={s.id}>
                    {s.title} <span className='text-muted-foreground'>· {categoryName(s.category)}</span>
                  </li>
                ))}
              </ol>
              <PropertyField label='Assegna a'>
                <Scelta
                  opzioni={people.map(p => ({ value: p.id, label: p.full_name }))}
                  value={assignees[i] ?? null}
                  onValueChange={v => setAssignees(a => ({ ...a, [i]: v }))}
                  azzera='Nessuno'
                  cerca='Cerca persona'
                />
              </PropertyField>
              <div className='flex justify-end'>
                <Button variant='outline' disabled={!assignees[i] || pending} onClick={() => assign(i)}>
                  Assegna giro
                </Button>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  )
}
