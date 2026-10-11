import { describe, expect, it } from 'vitest'

import { greenBand, greenIndex } from './green'

describe('green cover', () => {
  it('bands NDVI for an urban reader', () => {
    expect(greenBand(0.14).label).toBe('Poco verde')
    expect(greenBand(0.28).tone).toBe('info')
    expect(greenBand(0.5).tone).toBe('success')
    expect(greenBand(null).tone).toBe('muted')
  })
  it('turns NDVI into a 0–100 index', () => {
    expect(greenIndex(0.315)).toBe(32)
    expect(greenIndex(-0.1)).toBe(0)
    expect(greenIndex(null)).toBe(0)
  })
})
