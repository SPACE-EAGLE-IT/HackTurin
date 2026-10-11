'use client'

import 'maplibre-gl/dist/maplibre-gl.css'

import maplibregl from 'maplibre-gl'
import { useTheme } from 'next-themes'
import { useEffect, useRef } from 'react'

import { TORINO_CENTER } from '@/lib/civic/categories'

export type LatLon = { lat: number; lon: number }

/** A small map where a tap places the pin of the report. */
export function LocationPicker({ value, onChange }: { value: LatLon | null; onChange: (v: LatLon) => void }) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const marker = useRef<maplibregl.Marker | null>(null)
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
      const dot = document.createElement('div')
      dot.className = 'size-4 rounded-full bg-primary ring-4 ring-primary/30'
      marker.current = new maplibregl.Marker({ element: dot })
    }
    marker.current.setLngLat([value.lon, value.lat]).addTo(m)
    m.easeTo({ center: [value.lon, value.lat], zoom: Math.max(m.getZoom(), 15) })
  }, [value])

  return <div ref={el} className='h-64 w-full overflow-hidden rounded-md' />
}
