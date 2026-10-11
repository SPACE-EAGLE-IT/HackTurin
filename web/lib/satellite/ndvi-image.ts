import { CAP_CENTROIDS } from '@/lib/civic/cap'

import { type Raster, ndvi, sampleAt, SCL_LAND } from './indices'
import { lonLatToUtm } from './utm'

/** Geographic box of the overlay: [west, south, east, north]. */
export type Bounds = [number, number, number, number]

/** The city: every CAP centroid plus about 2 km around it. Shared by the image route and the map. */
export const OVERLAY_BOUNDS: Bounds = (() => {
  const pts = Object.values(CAP_CENTROIDS)
  const pad = 0.025
  const r = (v: number) => Math.round(v * 1000) / 1000
  return [
    r(Math.min(...pts.map(p => p[0])) - pad),
    r(Math.min(...pts.map(p => p[1])) - pad),
    r(Math.max(...pts.map(p => p[0])) + pad),
    r(Math.max(...pts.map(p => p[1])) + pad),
  ]
})()

// NDVI colour ramp of the overlay (data image, not UI styling): built-up → bare → grass → trees.
// Each stop is [ndvi, r, g, b]; alpha is fixed so streets and labels underneath stay readable.
export const NDVI_RAMP: readonly (readonly [number, number, number, number])[] = [
  [0.0, 120, 108, 96],
  [0.15, 196, 170, 120],
  [0.25, 222, 214, 120],
  [0.4, 120, 190, 90],
  [0.6, 30, 130, 60],
  [0.8, 10, 80, 40],
]
export const NDVI_ALPHA = 190

/** Colour of one NDVI value along the ramp (linear between stops, clamped at the ends). */
export function rampColor(v: number): [number, number, number] {
  const r = NDVI_RAMP
  if (v <= r[0][0]) return [r[0][1], r[0][2], r[0][3]]
  for (let i = 1; i < r.length; i++) {
    if (v <= r[i][0]) {
      const t = (v - r[i - 1][0]) / (r[i][0] - r[i - 1][0])
      return [1, 2, 3].map(k => Math.round(r[i - 1][k] + t * (r[i][k] - r[i - 1][k]))) as [
        number,
        number,
        number,
      ]
    }
  }
  const last = r[r.length - 1]
  return [last[1], last[2], last[3]]
}

const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
const fromMercY = (y: number) => (360 / Math.PI) * Math.atan(Math.exp(y)) - 90

/**
 * Resamples red/nir/SCL rasters (UTM grid) into a north-up image whose rows are evenly spaced in Web Mercator,
 * so MapLibre can stretch it over `bounds` without distortion. Clouds, water and nodata stay transparent.
 */
export function ndviRgba(
  bands: { red: Raster; nir: Raster; scl: Raster },
  bounds: Bounds,
  width: number
): { width: number; height: number; rgba: Uint8Array } {
  const [w, s, e, n] = bounds
  const yTop = mercY(n)
  const yBottom = mercY(s)
  const xSpan = ((e - w) * Math.PI) / 180
  const height = Math.max(1, Math.round((width * (yTop - yBottom)) / xSpan))
  const rgba = new Uint8Array(width * height * 4)
  for (let row = 0; row < height; row++) {
    const lat = fromMercY(yTop - ((row + 0.5) / height) * (yTop - yBottom))
    for (let col = 0; col < width; col++) {
      const lon = w + ((col + 0.5) / width) * (e - w)
      const { x, y } = lonLatToUtm(lon, lat, 32)
      const cls = sampleAt({ ...bands.scl, scale: 1, offset: 0 }, x, y)
      if (cls == null || !SCL_LAND.has(cls)) continue
      const red = sampleAt(bands.red, x, y)
      const nir = sampleAt(bands.nir, x, y)
      const v = red != null && nir != null ? ndvi(red, nir) : null
      if (v == null) continue
      const [r, g, b] = rampColor(v)
      const i = (row * width + col) * 4
      rgba[i] = r
      rgba[i + 1] = g
      rgba[i + 2] = b
      rgba[i + 3] = NDVI_ALPHA
    }
  }
  return { width, height, rgba }
}
