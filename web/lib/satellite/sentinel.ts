import { fromUrl, type GeoTIFFImage } from 'geotiff'
import { unstable_cache } from 'next/cache'

import { CAP_CENTROIDS } from '@/lib/civic/cap'
import { TORINO_BOUNDS } from '@/lib/civic/categories'

import { type AotBand, aotBands, type Raster, reflectanceOffset, zoneStats } from './indices'
import { ndviRgba, OVERLAY_BOUNDS } from './ndvi-image'
import { encodePng } from './png'
import { lonLatToUtm } from './utm'

const STAC = 'https://earth-search.aws.element84.com/v1'
const COLLECTION = 'sentinel-2-l2a'
const LOOKBACK_DAYS = 60
const MAX_CLOUD = 20
const MAX_SCENES = 3 // newest first; the next one is tried only when the city is mostly cloudy
const MIN_CITY_VALID = 50 // % of zones with enough clear pixels to accept a scene
const MIN_ZONE_VALID = 30 // % of clear pixels below which a zone is skipped
const ZONE_SIZE = 1000 // metres, side of the square read around each CAP centroid
const MARGIN = 800 // metres added around the CAP centroids to build the one city window per band
const TARGET_RES = 20 // metres: SCL native grid; 10 m bands are read from their 20 m overview
const BUDGET_MS = 45000
const OVERLAY_WIDTH = 900 // px across the city: ~25 m per pixel, close to the 20 m source

export type SatelliteZone = {
  cap: string
  lat: number
  lon: number
  aot: number
  aotBand: AotBand
  ndvi: number | null
  validPct: number
}

export type SatelliteResult =
  | {
      available: true
      sceneId: string
      datetime: string
      cloudCover: number
      tile: string | null
      source: string
      zones: SatelliteZone[]
      skipped: string[]
    }
  | { available: false; reason: string }

type StacAsset = { href: string; 'raster:bands'?: { scale?: number; offset?: number; nodata?: number }[] }
type StacItem = {
  id: string
  bbox: [number, number, number, number]
  properties: {
    datetime: string
    'eo:cloud_cover': number
    'grid:code'?: string
    'earthsearch:boa_offset_applied'?: boolean
  }
  assets: Record<string, StacAsset>
}

const CAPS = Object.entries(CAP_CENTROIDS)

/** Newest clear scenes whose footprint box contains every CAP centroid. */
async function searchScenes(signal: AbortSignal): Promise<StacItem[]> {
  const to = new Date()
  const from = new Date(to.getTime() - LOOKBACK_DAYS * 86400000)
  const b = TORINO_BOUNDS
  const r = await fetch(`${STAC}/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      collections: [COLLECTION],
      bbox: [b.minLon, b.minLat, b.maxLon, b.maxLat],
      datetime: `${from.toISOString()}/${to.toISOString()}`,
      query: { 'eo:cloud_cover': { lt: MAX_CLOUD } },
      sortby: [{ field: 'properties.datetime', direction: 'desc' }],
      limit: 30,
    }),
    cache: 'no-store',
    signal,
  })
  if (!r.ok) throw new Error(`STAC ${r.status}`)
  const items = ((await r.json()) as { features?: StacItem[] }).features ?? []
  const lons = CAPS.map(([, c]) => c[0])
  const lats = CAPS.map(([, c]) => c[1])
  return items.filter(
    i =>
      i.bbox[0] <= Math.min(...lons) &&
      i.bbox[2] >= Math.max(...lons) &&
      i.bbox[1] <= Math.min(...lats) &&
      i.bbox[3] >= Math.max(...lats) &&
      ['aot', 'red', 'nir', 'scl'].every(k => i.assets[k]?.href)
  )
}

/** Reads one band over a UTM box from a public COG, from the overview closest to TARGET_RES (never coarser). */
async function readBand(
  asset: StacAsset,
  box: { minX: number; minY: number; maxX: number; maxY: number },
  signal: AbortSignal,
  boaOffsetApplied?: boolean
): Promise<Raster> {
  const tiff = await fromUrl(asset.href, {}, signal)
  const base = await tiff.getImage()
  const count = await tiff.getImageCount()
  let img: GeoTIFFImage = base
  for (let i = 1; i < count; i++) {
    const o = await tiff.getImage(i)
    if (Math.abs(o.getResolution(base)[0]) > TARGET_RES + 0.01) break
    img = o
  }
  const res = Math.abs(img.getResolution(base)[0])
  const [ox, oy] = base.getOrigin()
  const col0 = Math.max(0, Math.floor((box.minX - ox) / res))
  const row0 = Math.max(0, Math.floor((oy - box.maxY) / res))
  const col1 = Math.min(img.getWidth(), Math.ceil((box.maxX - ox) / res))
  const row1 = Math.min(img.getHeight(), Math.ceil((oy - box.minY) / res))
  if (col1 <= col0 || row1 <= row0) throw new Error('city outside the tile')
  const rasters = await img.readRasters({ window: [col0, row0, col1, row1], samples: [0], signal })
  const band = asset['raster:bands']?.[0] ?? {}
  return {
    data: rasters[0] as ArrayLike<number>,
    width: col1 - col0,
    height: row1 - row0,
    originX: ox + col0 * res,
    originY: oy - row0 * res,
    res,
    scale: band.scale ?? 1,
    offset: reflectanceOffset(band.offset, boaOffsetApplied),
    nodata: band.nodata ?? null,
  }
}

/** Per-CAP AOT and NDVI of one scene. */
async function computeScene(item: StacItem, signal: AbortSignal): Promise<SatelliteResult> {
  const pts = CAPS.map(([cap, [lon, lat]]) => ({ cap, lon, lat, ...lonLatToUtm(lon, lat, 32) }))
  const box = {
    minX: Math.min(...pts.map(p => p.x)) - MARGIN,
    maxX: Math.max(...pts.map(p => p.x)) + MARGIN,
    minY: Math.min(...pts.map(p => p.y)) - MARGIN,
    maxY: Math.max(...pts.map(p => p.y)) + MARGIN,
  }
  const boa = item.properties['earthsearch:boa_offset_applied']
  const [scl, aot, red, nir] = await Promise.all([
    readBand(item.assets.scl, box, signal),
    readBand(item.assets.aot, box, signal),
    readBand(item.assets.red, box, signal, boa),
    readBand(item.assets.nir, box, signal, boa),
  ])
  const stats = pts.map(p => ({ ...p, ...zoneStats({ scl, aot, red, nir }, p.x, p.y, ZONE_SIZE) }))
  const ok = stats.filter(s => s.validPct >= MIN_ZONE_VALID && s.aot != null)
  const bands = aotBands(ok.map(s => s.aot as number))
  const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d
  return {
    available: true,
    sceneId: item.id,
    datetime: item.properties.datetime,
    cloudCover: round(item.properties['eo:cloud_cover'], 1),
    tile: item.properties['grid:code'] ?? null,
    source: `${STAC}/collections/${COLLECTION}/items/${item.id}`,
    zones: ok.map((s, i) => ({
      cap: s.cap,
      lat: s.lat,
      lon: s.lon,
      aot: round(s.aot as number, 3),
      aotBand: bands[i],
      ndvi: s.ndvi != null ? round(s.ndvi, 3) : null,
      validPct: s.validPct,
    })),
    skipped: stats.filter(s => !ok.includes(s)).map(s => s.cap),
  }
}

async function compute(): Promise<SatelliteResult> {
  const signal = AbortSignal.timeout(BUDGET_MS)
  const scenes = (await searchScenes(signal)).slice(0, MAX_SCENES)
  if (!scenes.length)
    return { available: false, reason: 'Nessuna immagine poco nuvolosa negli ultimi 60 giorni.' }
  let last: SatelliteResult | null = null
  for (const s of scenes) {
    const r = await computeScene(s, signal)
    if (r.available && r.zones.length >= (CAPS.length * MIN_CITY_VALID) / 100) return r
    last = r
  }
  return last && last.available && last.zones.length
    ? last
    : { available: false, reason: 'Le immagini recenti sono coperte da nubi sulla città.' }
}

// One computation per 12 h: about a dozen COG range reads, shared by the API and the statistics page.
// A thrown error is not cached, so a network failure is retried on the next request.
class Unavailable extends Error {}

const cached = unstable_cache(
  async () => {
    const r = await compute()
    if (!r.available) throw new Unavailable(r.reason)
    return r
  },
  ['satellite-sentinel2-v2'],
  { revalidate: 43200 }
)

let inflight: Promise<SatelliteResult> | null = null

/** Sentinel-2 haze (AOT) and green cover (NDVI) per CAP from the newest clear scene; never throws. */
export function satelliteZones(): Promise<SatelliteResult> {
  inflight ??= cached()
    .catch((e: unknown): SatelliteResult => {
      if (!(e instanceof Unavailable)) console.warn('[satellite]', e)
      return {
        available: false,
        reason:
          e instanceof Unavailable ? e.message : 'Servizio satellitare non raggiungibile, riprova più tardi.',
      }
    })
    .finally(() => (inflight = null))
  return inflight
}

// ---------------------------------------------------------------------------
// NDVI image overlay of the same scene, for the map.

/** The NDVI image of the scene used for the zones, as a PNG over OVERLAY_BOUNDS; null when unavailable. */
export async function ndviOverlayPng(): Promise<{ png: Buffer; sceneId: string; datetime: string } | null> {
  const zones = await satelliteZones()
  if (!zones.available) return null
  const signal = AbortSignal.timeout(BUDGET_MS)
  const r = await fetch(`${STAC}/collections/${COLLECTION}/items/${zones.sceneId}`, {
    cache: 'no-store',
    signal,
  })
  if (!r.ok) return null
  const item = (await r.json()) as StacItem
  const [w, s, e, n] = OVERLAY_BOUNDS
  const corners = [lonLatToUtm(w, s, 32), lonLatToUtm(w, n, 32), lonLatToUtm(e, s, 32), lonLatToUtm(e, n, 32)]
  const box = {
    minX: Math.min(...corners.map(c => c.x)),
    maxX: Math.max(...corners.map(c => c.x)),
    minY: Math.min(...corners.map(c => c.y)),
    maxY: Math.max(...corners.map(c => c.y)),
  }
  const boa = item.properties['earthsearch:boa_offset_applied']
  const [scl, red, nir] = await Promise.all([
    readBand(item.assets.scl, box, signal),
    readBand(item.assets.red, box, signal, boa),
    readBand(item.assets.nir, box, signal, boa),
  ])
  const img = ndviRgba({ red, nir, scl }, OVERLAY_BOUNDS, OVERLAY_WIDTH)
  return {
    png: encodePng(img.width, img.height, img.rgba),
    sceneId: item.id,
    datetime: item.properties.datetime,
  }
}
