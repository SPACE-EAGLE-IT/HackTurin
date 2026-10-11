import { capFor } from './cap'
import { TORINO_BOUNDS as B } from './categories'

/** OpenStreetMap Nominatim: free, 1 request/s, needs an identifying User-Agent on the server. */
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const HEADERS = { 'User-Agent': 'ToBe-Torino/1.0 (hackathon)', 'Accept-Language': 'it' }

export type Place = { lat: number; lon: number; label: string; cap: string }

type NominatimAddress = Record<string, string | undefined>

/** "Via Roma 12, 10121" from a Nominatim address, falling back to the district. */
export function shortAddress(a: NominatimAddress | undefined, fallback = ''): string {
  if (!a) return fallback
  const street = a.road ?? a.pedestrian ?? a.square ?? a.footway ?? a.neighbourhood ?? a.suburb
  const line = [street && [street, a.house_number].filter(Boolean).join(' '), a.postcode]
    .filter(Boolean)
    .join(', ')
  return line || fallback
}

/** An address or landmark spoken or typed by a citizen, resolved inside Turin; `null` if not found. */
export async function geocodeTorino(query: string): Promise<Place | null> {
  const q = /torino/i.test(query) ? query : `${query}, Torino`
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '1',
    countrycodes: 'it',
    bounded: '1',
    viewbox: `${B.minLon},${B.maxLat},${B.maxLon},${B.minLat}`,
  })
  const r = await fetch(`${NOMINATIM}/search?${params}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(6000),
  }).catch(() => null)
  if (!r?.ok) return null
  const rows = (await r.json().catch(() => [])) as {
    lat: string
    lon: string
    display_name: string
    address?: NominatimAddress
  }[]
  const hit = rows[0]
  if (!hit) return null
  const lat = Number(hit.lat)
  const lon = Number(hit.lon)
  return { lat, lon, label: shortAddress(hit.address, hit.display_name), cap: capFor(lon, lat) }
}
