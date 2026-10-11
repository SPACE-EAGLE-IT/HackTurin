import { inflateSync } from 'node:zlib'

import { describe, expect, it } from 'vitest'

import type { Raster } from './indices'
import { ndviRgba, NDVI_ALPHA, rampColor } from './ndvi-image'
import { crc32, encodePng } from './png'
import { lonLatToUtm } from './utm'

describe('png encoder', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })
  it('writes a valid PNG with the pixels intact', () => {
    const px = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 128])
    const png = encodePng(2, 1, px)
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG')
    const idatAt = png.indexOf('IDAT')
    const len = png.readUInt32BE(idatAt - 4)
    const raw = inflateSync(png.subarray(idatAt + 4, idatAt + 4 + len))
    expect([...raw]).toEqual([0, ...px])
  })
})

describe('ndvi overlay', () => {
  it('ramps from built-up to trees', () => {
    expect(rampColor(-0.3)).toEqual([120, 108, 96])
    expect(rampColor(0.9)).toEqual([10, 80, 40])
    const mid = rampColor(0.5)
    expect(mid[1]).toBeGreaterThan(mid[0])
  })
  it('colours land, leaves water and outside pixels transparent', () => {
    const c = lonLatToUtm(7.68, 45.07, 32)
    const grid = (value: number): Raster => ({
      data: new Array(100 * 100).fill(value),
      width: 100,
      height: 100,
      originX: c.x - 1000,
      originY: c.y + 1000,
      res: 20,
      scale: 1,
      offset: 0,
      nodata: null,
    })
    const bounds: [number, number, number, number] = [7.665, 45.06, 7.695, 45.08]
    const land = ndviRgba({ red: grid(0.05), nir: grid(0.45), scl: grid(4) }, bounds, 20)
    expect(land.height).toBeGreaterThan(10)
    expect(land.rgba[(5 * 20 + 10) * 4 + 3]).toBe(NDVI_ALPHA)
    const water = ndviRgba({ red: grid(0.05), nir: grid(0.45), scl: grid(6) }, bounds, 20)
    expect(water.rgba.every((v, i) => i % 4 !== 3 || v === 0)).toBe(true)
    const wide = ndviRgba({ red: grid(0.05), nir: grid(0.45), scl: grid(4) }, [7.5, 45.0, 7.9, 45.2], 40)
    expect(wide.rgba[3]).toBe(0)
  })
})
