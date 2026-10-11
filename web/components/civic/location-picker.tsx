'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import maplibregl from 'maplibre-gl'
import { useTheme } from 'next-themes'
import { useEffect, useRef } from 'react'

import { TORINO_CENTER } from '@/lib/civic/categories'

export type LatLon = { lat: number; lon: number }

/** A small map where a tap (or dragging the pin) places the report. `accuracy` draws the GPS halo in metres. */
export function LocationPicker({
  value,
  onChange,
  accuracy,
}: {
  value: LatLon | null
  onChange: (v: LatLon) => void
  accuracy?: number | null
}) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const marker = useRef<maplibregl.Marker | null>(null)
  const halo = useRef<HTMLDivElement | null>(null)
  const onChangeRef = useRef(onChange)
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!el.current) return
    const m = new maplibregl.Map({
      container: el.current,
      style: `https://basemaps.cartocdn.com/gl/${resolvedTheme === 'dark' ? 'dark-matter' : 'positron'}-gl-style/style.json`,
      center: TORINO_CENTER,
      zoom: 13,
      attributionControl: { compact: true },
    })
    m.on('click', e => onChangeRef.current({ lat: e.lngLat.lat, lon: e.lngLat.lng }))
    map.current = m
    return () => {
      m.remove()
      map.current = null
      marker.current = null
    }
  }, [resolvedTheme])

  useEffect(() => {
    const m = map.current
    if (!m || !value) return
    if (!marker.current) {
      const root = document.createElement('div')
      root.className = 'relative flex size-4 items-center justify-center'
      const ring = document.createElement('div')
      ring.className = 'bg-primary/15 ring-primary/40 pointer-events-none absolute rounded-full ring-1'
      const dot = document.createElement('div')
      dot.className = 'bg-primary ring-background size-4 cursor-grab rounded-full shadow-md ring-2'
      root.append(ring, dot)
      halo.current = ring
      const pin = new maplibregl.Marker({ element: root, draggable: true })
      pin.on('dragend', () => {
        const p = pin.getLngLat()
        onChangeRef.current({ lat: p.lat, lon: p.lng })
      })
      marker.current = pin
    }
    marker.current.setLngLat([value.lon, value.lat]).addTo(m)
    m.easeTo({ center: [value.lon, value.lat], zoom: Math.max(m.getZoom(), 16) })
  }, [value])

  // The accuracy halo is sized in pixels from metres at the current zoom and latitude.
  useEffect(() => {
    const m = map.current
    if (!m || !value) return
    const draw = () => {
      if (!halo.current) return
      const metresPerPx = (156543.03 * Math.cos((value.lat * Math.PI) / 180)) / 2 ** m.getZoom()
      const px = accuracy ? Math.min(400, Math.max(0, (2 * accuracy) / metresPerPx)) : 0
      halo.current.style.width = `${px}px`
      halo.current.style.height = `${px}px`
    }
    draw()
    m.on('zoom', draw)
    return () => {
      m.off('zoom', draw)
    }
  }, [value, accuracy])

  return <div ref={el} className='h-64 w-full overflow-hidden rounded-md' />
}
