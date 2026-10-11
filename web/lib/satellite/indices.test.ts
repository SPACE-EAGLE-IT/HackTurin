import { describe, expect, it } from 'vitest'

import { aotBands, aotLevel, ndvi, physical, quantile, type Raster, reflectanceOffset, sampleAt, zoneStats } from './indices'

const grid = (values: number[], width: number, res: number, scale = 1, offset = 0): Raster => ({
  data: values,
  width,
  height: values.length / width,
  originX: 0,
  originY: width * res,
  res,
  scale,
  offset,
  nodata: 0,
})

describe('scaling', () => {
  it('applies scale and offset and skips nodata', () => {
    expect(physical(139, 0.001, 0, 0)).toBeCloseTo(0.139)
    expect(physical(1500, 0.0001, -0.1, 0)).toBeCloseTo(0.05)
    expect(physical(0, 0.0001, -0.1, 0)).toBeNull()
  })

  it('does not apply the BOA offset twice', () => {
    expect(reflectanceOffset(-0.1, true)).toBe(0)
    expect(reflectanceOffset(-0.1, false)).toBe(-0.1)
    expect(reflectanceOffset(undefined, undefined)).toBe(0)
  })
})

describe('ndvi', () => {
  it('is high on vegetation, near zero on concrete, null when undefined', () => {
    expect(ndvi(0.04, 0.3)).toBeCloseTo(0.765, 3)
    expect(ndvi(0.1, 0.12)).toBeCloseTo(0.091, 3)
    expect(ndvi(0, 0)).toBeNull()
  })
})

describe('sampleAt', () => {
  it('reads the nearest pixel in UTM and returns null outside', () => {
    const r = grid([1, 2, 3, 4], 2, 10)
    expect(sampleAt(r, 5, 15)).toBe(1)
    expect(sampleAt(r, 15, 5)).toBe(4)
    expect(sampleAt(r, 25, 5)).toBeNull()
  })
})

describe('zoneStats', () => {
  // 4x4 SCL grid of 10 m: one row of cloud (9), one water pixel (6), the rest vegetation (4) or built-up (5).
  const scl = grid([9, 9, 9, 9, 4, 4, 5, 5, 4, 4, 5, 6, 4, 4, 5, 5], 4, 10)
  const aot = grid(Array(16).fill(200), 4, 10, 0.001)
  const red = grid([1, 1, 1, 1, 400, 400, 1000, 1000, 400, 400, 1000, 300, 400, 400, 1000, 1000], 4, 10, 0.0001)
  const nir = grid([1, 1, 1, 1, 3600, 3600, 1200, 1200, 3600, 3600, 1200, 100, 3600, 3600, 1200, 1200], 4, 10, 0.0001)

  it('masks clouds, keeps water for AOT only, reports coverage', () => {
    const s = zoneStats({ scl, aot, red, nir }, 20, 20, 40)
    expect(s.validPct).toBe(75)
    expect(s.aot).toBeCloseTo(0.2)
    // 6 vegetation pixels at 0.8, 5 built-up at ~0.0909; water excluded.
    expect(s.ndvi).toBeCloseTo((6 * 0.8 + 5 * (200 / 2200)) / 11, 6)
  })
})

describe('aotBands', () => {
  it('splits the city in terciles', () => {
    expect(aotBands([0.1, 0.2, 0.3, 0.15, 0.25, 0.35])).toEqual(['bassa', 'media', 'alta', 'bassa', 'media', 'alta'])
  })

  it('calls a uniform city medium instead of inventing differences', () => {
    expect(aotBands([0.137, 0.138, 0.139])).toEqual(['media', 'media', 'media'])
  })

  it('reads quantiles and absolute levels', () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5)
    expect(aotLevel(0.05)).toBe('Aria limpida')
    expect(aotLevel(0.14)).toBe('Foschia leggera')
    expect(aotLevel(null)).toBe('—')
  })
})
