'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import maplibregl from 'maplibre-gl'
import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'

import { tokenColor } from '@/components/civic/token-color'
import { CATEGORIES, TORINO_CENTER } from '@/lib/civic/categories'
import { metricLabel, metricUnit, pm25Band } from '@/lib/civic/metrics'
import { greenBand, greenIndex } from '@/lib/satellite/green'
import { aotLevel } from '@/lib/satellite/indices'
import { OVERLAY_BOUNDS } from '@/lib/satellite/ndvi-image'

/** Sentinel-2 cloudless mosaic (EOX, CC BY-NC-SA 4.0). CARTO's raster labels now need a key, so none on top. */
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf',
  sources: {
    s2: {
      type: 'raster',
      tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg'],
      tileSize: 256,
      maxzoom: 15,
      attribution:
        '<a href="https://s2maps.eu" target="_blank">Sentinel-2 cloudless 2024</a> di EOX IT Services GmbH (contiene dati Copernicus Sentinel modificati 2024)',
    },
  },
  layers: [{ id: 's2', type: 'raster', source: 's2' }],
}

const STYLE = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
}

export type MapReport = { id: string; category: string; lat: number; lon: number; severity: number }
export type MapDevice = { id: string; name: string; type: string; lat: number; lon: number; online: boolean }
/** A Sentinel-2 zone reading: green cover and haze around a CAP centroid. */
export type MapZone = {
  cap: string
  lat: number
  lon: number
  ndvi: number | null
  aot: number
  date: string
}

export type MapStation = {
  id: string
  source: string
  name: string
  lat: number
  lon: number
  values: Record<string, number>
}

const TONE_DOT = {
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted-foreground',
}

function popupNode(title: string, lines: string[]) {
  const root = document.createElement('div')
  root.className = 'space-y-1 text-xs text-foreground'
  const h = document.createElement('div')
  h.className = 'text-sm font-medium'
  h.textContent = title
  root.append(h)
  for (const line of lines) {
    const p = document.createElement('div')
    p.className = 'text-muted-foreground'
    p.textContent = line
    root.append(p)
  }
  return root
}

export function ReportMap({
  reports,
  devices = [],
  stations = [],
  zones = [],
  heat = false,
  onSelect,
  className = 'h-full w-full',
  fitToReports = false,
  basemap = 'mappa',
  ndviLayer = false,
}: {
  reports: MapReport[]
  devices?: MapDevice[]
  stations?: MapStation[]
  zones?: MapZone[]
  heat?: boolean
  onSelect?: (id: string) => void
  className?: string
  fitToReports?: boolean
  /** 'satellite' swaps the street map for the Sentinel-2 cloudless mosaic. */
  basemap?: 'mappa' | 'satellite'
  /** Shows the NDVI image of the latest clear Sentinel-2 scene over the city. */
  ndviLayer?: boolean
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef<maplibregl.Marker[]>([])
  const onSelectRef = useRef(onSelect)
  const [ready, setReady] = useState(0)
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light'

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // The map is rebuilt when the theme changes: basemap and token colours both depend on it.
  useEffect(() => {
    if (!el.current) return
    const m = new maplibregl.Map({
      container: el.current,
      style: basemap === 'satellite' ? SATELLITE_STYLE : STYLE[theme],
      center: TORINO_CENTER,
      zoom: 11.6,
      attributionControl: { compact: true },
    })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    m.on('load', () => {
      const color = [
        'match',
        ['get', 'category'],
        ...CATEGORIES.flatMap(c => [c.slug, tokenColor(c.token)]),
        'gray',
      ]
      m.addSource('reports', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 38,
        clusterMaxZoom: 15,
      })
      m.addLayer({
        id: 'heat',
        type: 'heatmap',
        source: 'reports',
        layout: { visibility: 'none' },
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'severity'], 1, 0.3, 5, 1],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 15, 40],
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0,
            'rgba(0,0,0,0)',
            0.3,
            tokenColor('--chart-ochre-tint'),
            0.6,
            tokenColor('--chart-ochre'),
            1,
            tokenColor('--chart-alert'),
          ],
        },
      })
      m.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'reports',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': tokenColor('--primary'),
          'circle-opacity': 0.85,
          'circle-stroke-color': tokenColor('--background'),
          'circle-stroke-width': 2,
          'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 30, 27],
        },
      })
      m.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'reports',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-size': 12,
          'text-font': ['Montserrat Medium', 'Open Sans Semibold'],
        },
        paint: { 'text-color': tokenColor('--primary-foreground') },
      })
      m.addLayer({
        id: 'points',
        type: 'circle',
        source: 'reports',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': color as maplibregl.ExpressionSpecification,
          'circle-stroke-color': tokenColor('--background'),
          'circle-stroke-width': 2,
          'circle-radius': ['interpolate', ['linear'], ['get', 'severity'], 1, 5, 5, 9],
        },
      })
      m.on('click', 'clusters', e => {
        const f = m.queryRenderedFeatures(e.point, { layers: ['clusters'] })[0]
        const src = m.getSource('reports') as maplibregl.GeoJSONSource
        src.getClusterExpansionZoom(Number(f.properties?.cluster_id)).then(z =>
          m.easeTo({
            center: (f.geometry as unknown as { coordinates: [number, number] }).coordinates,
            zoom: z + 0.3,
          })
        )
      })
      m.on('click', 'points', e => {
        const id = e.features?.[0]?.properties?.id
        if (typeof id === 'string') onSelectRef.current?.(id)
      })
      for (const layer of ['clusters', 'points']) {
        m.on('mouseenter', layer, () => (m.getCanvas().style.cursor = 'pointer'))
        m.on('mouseleave', layer, () => (m.getCanvas().style.cursor = ''))
      }
      setReady(n => n + 1)
    })
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [theme, basemap])

  // The NDVI image is added on first use only: it is a ~1 MB download.
  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    if (ndviLayer && !m.getSource('ndvi')) {
      const [w, s, e, n] = OVERLAY_BOUNDS
      m.addSource('ndvi', {
        type: 'image',
        url: '/api/public/satellite/ndvi',
        coordinates: [
          [w, n],
          [e, n],
          [e, s],
          [w, s],
        ],
      })
      m.addLayer({ id: 'ndvi', type: 'raster', source: 'ndvi', paint: { 'raster-opacity': 0.8 } }, 'heat')
    }
    if (m.getLayer('ndvi')) m.setLayoutProperty('ndvi', 'visibility', ndviLayer ? 'visible' : 'none')
  }, [ndviLayer, ready])

  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    const source = m.getSource('reports') as maplibregl.GeoJSONSource | undefined
    source?.setData({
      type: 'FeatureCollection',
      features: reports.map(r => ({
        type: 'Feature',
        properties: { id: r.id, category: r.category, severity: r.severity },
        geometry: { type: 'Point', coordinates: [r.lon, r.lat] },
      })),
    })
    if (fitToReports && reports.length) {
      const b = new maplibregl.LngLatBounds()
      reports.forEach(r => b.extend([r.lon, r.lat]))
      m.fitBounds(b, { padding: 60, maxZoom: 15, duration: 0 })
    }
  }, [reports, ready, fitToReports])

  useEffect(() => {
    const m = map.current
    if (!ready || !m || !m.getLayer('heat')) return
    m.setLayoutProperty('heat', 'visibility', heat ? 'visible' : 'none')
    for (const l of ['clusters', 'cluster-count', 'points'])
      m.setLayoutProperty(l, 'visibility', heat ? 'none' : 'visible')
  }, [heat, ready])

  // Devices and stations are DOM markers so they can carry a popup and the design-system classes.
  useEffect(() => {
    const m = map.current
    if (!ready || !m) return
    markers.current.forEach(x => x.remove())
    const deviceMarkers = devices.map(d => {
      const dot = document.createElement('div')
      dot.className = `size-3.5 rounded-full ring-2 ring-background ${d.online ? 'bg-success' : 'bg-muted-foreground'}`
      const kind = d.type === 'phone' ? 'POD telefono' : d.type === 'mobile' ? 'POD mobile' : 'POD fisso'
      return new maplibregl.Marker({ element: dot })
        .setLngLat([d.lon, d.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 12, closeButton: false }).setDOMContent(
            popupNode(d.name, [kind, d.online ? 'Online' : 'Offline'])
          )
        )
        .addTo(m)
    })
    const stationMarkers = stations.map(st => {
      const pm = st.values.pm25_ugm3
      const t = st.values.temperature_c
      const pill = document.createElement('div')
      pill.className =
        'flex cursor-pointer items-center gap-1.5 rounded-full bg-popover px-2 py-0.5 text-xs font-medium text-popover-foreground shadow-sm ring-1 ring-border'
      const dot = document.createElement('span')
      dot.className = `size-2 rounded-full ${TONE_DOT[pm25Band(pm).tone]}`
      const label = document.createElement('span')
      label.textContent = pm != null ? `PM2.5 ${Math.round(pm)}` : t != null ? `${t.toFixed(1)}°` : '•'
      pill.append(dot, label)
      const lines = Object.entries(st.values).map(([k, v]) => `${metricLabel(k)}: ${v} ${metricUnit(k)}`)
      lines.unshift(st.source === 'pod' ? 'POD To.Be' : 'Sensor.Community')
      return new maplibregl.Marker({ element: pill })
        .setLngLat([st.lon, st.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 12, closeButton: false }).setDOMContent(popupNode(st.name, lines))
        )
        .addTo(m)
    })
    const zoneMarkers = zones.map(z => {
      const band = greenBand(z.ndvi)
      const pill = document.createElement('div')
      pill.className =
        'flex cursor-pointer items-center gap-1.5 rounded-full bg-popover px-2 py-0.5 text-xs font-medium text-popover-foreground shadow-sm ring-1 ring-border'
      const dot = document.createElement('span')
      dot.className = `size-2 rounded-full ${TONE_DOT[band.tone === 'info' ? 'muted' : band.tone]}`
      const label = document.createElement('span')
      label.textContent = `Verde ${greenIndex(z.ndvi)}`
      pill.append(dot, label)
      return new maplibregl.Marker({ element: pill })
        .setLngLat([z.lon, z.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 12, closeButton: false }).setDOMContent(
            popupNode(`CAP ${z.cap} · Sentinel-2`, [
              `${band.label} (NDVI ${z.ndvi?.toFixed(2) ?? 'n/d'})`,
              `${aotLevel(z.aot)} (AOT ${z.aot.toFixed(2)})`,
              `Immagine del ${z.date}`,
            ])
          )
        )
        .addTo(m)
    })
    markers.current = [...deviceMarkers, ...stationMarkers, ...zoneMarkers]
  }, [devices, stations, zones, ready])

  // MapLibre's stylesheet forces `position: relative` on its container, which beats Tailwind's
  // layered utilities: the caller's sizing goes on a wrapper and the map just fills it.
  return (
    <div className={className}>
      <div ref={el} className='size-full' />
    </div>
  )
}
