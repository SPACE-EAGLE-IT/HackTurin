// Pure maths of the satellite layer: digital numbers to physical values, NDVI, SCL masking, per-zone statistics
// and the relative haze band. No I/O here, so every step is unit-tested.

/** A window of one band in its own UTM grid (north-up, origin = top-left corner of the first pixel). */
export type Raster = {
  data: ArrayLike<number>
  width: number
  height: number
  originX: number
  originY: number
  res: number
  /** Physical value = DN * scale + offset (STAC raster:bands); DN = nodata is skipped. */
  scale: number
  offset: number
  nodata: number | null
}

export type AotBand = 'bassa' | 'media' | 'alta'

// Scene Classification (Sen2Cor SCL): 4 vegetation, 5 not vegetated (bare soil and built-up), 6 water.
// Excluded: 0 no data, 1 saturated, 2 dark area/topographic shadow, 3 cloud shadow, 7 unclassified,
// 8-9 cloud, 10 thin cirrus, 11 snow.
export const SCL_CLEAR = new Set([4, 5, 6])
// Water is clear sky for the aerosol estimate but would drag the green-cover mean down: NDVI keeps land only.
export const SCL_LAND = new Set([4, 5])

/** Physical value of a digital number, or null for nodata. */
export function physical(dn: number, scale: number, offset: number, nodata: number | null): number | null {
  if (!Number.isFinite(dn) || (nodata != null && dn === nodata)) return null
  return dn * scale + offset
}

/**
 * Offset to apply to L2A reflectance DNs. Since processing baseline 04.00 the DNs carry +1000 (BOA_ADD_OFFSET),
 * declared as offset -0.1 in STAC raster:bands. Earth Search COGs flagged `earthsearch:boa_offset_applied`
 * have already been shifted back (water reads ~0.02, not ~-0.08), yet still declare -0.1: applying it twice
 * would push dark surfaces negative, so the flag wins.
 */
export function reflectanceOffset(
  declared: number | undefined,
  boaOffsetApplied: boolean | undefined
): number {
  return boaOffsetApplied ? 0 : (declared ?? 0)
}

/** Normalised difference vegetation index from surface reflectances; null when undefined. */
export function ndvi(red: number, nir: number): number | null {
  const sum = nir + red
  if (!(sum > 0)) return null
  const v = (nir - red) / sum
  return v < -1 || v > 1 ? null : v
}

/** Nearest-pixel value of a raster at a UTM point, already scaled; null outside the window or on nodata. */
export function sampleAt(r: Raster, x: number, y: number): number | null {
  const col = Math.floor((x - r.originX) / r.res)
  const row = Math.floor((r.originY - y) / r.res)
  if (col < 0 || row < 0 || col >= r.width || row >= r.height) return null
  return physical(r.data[row * r.width + col], r.scale, r.offset, r.nodata)
}

export type ZoneStats = { aot: number | null; ndvi: number | null; validPct: number }

/**
 * Statistics of a square zone (side `size` metres) centred on a UTM point, walking the SCL grid:
 * mean AOT over clear pixels, mean NDVI over clear land pixels, share of clear pixels.
 */
export function zoneStats(
  bands: { scl: Raster; aot: Raster; red: Raster; nir: Raster },
  cx: number,
  cy: number,
  size = 1000
): ZoneStats {
  const { scl } = bands
  const half = size / 2
  let total = 0
  let clear = 0
  let aotSum = 0
  let aotN = 0
  let ndviSum = 0
  let ndviN = 0
  for (let y = cy + half - scl.res / 2; y > cy - half; y -= scl.res) {
    for (let x = cx - half + scl.res / 2; x < cx + half; x += scl.res) {
      total++
      const cls = sampleAt(scl, x, y)
      if (cls == null || !SCL_CLEAR.has(cls)) continue
      clear++
      const a = sampleAt(bands.aot, x, y)
      if (a != null) {
        aotSum += a
        aotN++
      }
      if (!SCL_LAND.has(cls)) continue
      const red = sampleAt(bands.red, x, y)
      const nir = sampleAt(bands.nir, x, y)
      const v = red != null && nir != null ? ndvi(red, nir) : null
      if (v != null) {
        ndviSum += v
        ndviN++
      }
    }
  }
  return {
    aot: aotN ? aotSum / aotN : null,
    ndvi: ndviN ? ndviSum / ndviN : null,
    validPct: total ? Math.round((clear / total) * 100) : 0,
  }
}

/** Value at quantile q (0..1) of a sorted array, linear interpolation. */
export function quantile(sorted: readonly number[], q: number): number {
  if (!sorted.length) return NaN
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

// Below this spread the city is uniformly hazy or clear: splitting it in terciles would invent differences.
export const AOT_MIN_SPREAD = 0.02

/**
 * Relative haze band of each zone against the city in the same scene: terciles of the zone AOT means.
 * When max - min < AOT_MIN_SPREAD every zone is 'media'.
 */
export function aotBands(values: readonly number[]): AotBand[] {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length || sorted[sorted.length - 1] - sorted[0] < AOT_MIN_SPREAD)
    return values.map(() => 'media')
  const t1 = quantile(sorted, 1 / 3)
  const t2 = quantile(sorted, 2 / 3)
  return values.map(v => (v <= t1 ? 'bassa' : v <= t2 ? 'media' : 'alta'))
}

/** Plain-language reading of an absolute AOT at 550 nm (rule of thumb, not a regulatory threshold). */
export function aotLevel(aot: number | null | undefined): string {
  if (aot == null) return '—'
  if (aot < 0.1) return 'Aria limpida'
  if (aot < 0.25) return 'Foschia leggera'
  if (aot < 0.5) return 'Foschia marcata'
  return 'Foschia intensa'
}

export const AOT_BAND_LABEL: Record<AotBand, string> = { bassa: 'Bassa', media: 'Media', alta: 'Alta' }
