import { describe, expect, it } from 'vitest'

import { lonLatToUtm, utmToLonLat } from './utm'

describe('UTM zone 32N', () => {
  it('puts the central meridian at 500 km with the scaled meridian arc as northing', () => {
    // Meridian arc from the equator to 45°N on WGS84 is 4 984 944.38 m; times k0 = 0.9996.
    const p = lonLatToUtm(9, 45)
    expect(p.x).toBeCloseTo(500000, 3)
    expect(p.y).toBeCloseTo(4982950.4, 0)
  })

  it('matches the corners of Sentinel-2 tile 32TLQ (STAC proj:transform vs bbox)', () => {
    // North-east corner (409 800, 5 000 040) is the tile's highest latitude, south-east the most eastern longitude.
    expect(utmToLonLat(409800, 5000040).lat).toBeCloseTo(45.148064, 4)
    expect(utmToLonLat(409800, 4890240).lon).toBeCloseTo(7.871906, 4)
  })

  it('round-trips a point in Turin to the millimetre', () => {
    const p = lonLatToUtm(7.6858, 45.0712)
    expect(p.x).toBeGreaterThan(396000)
    expect(p.x).toBeLessThan(397000)
    const back = utmToLonLat(p.x, p.y)
    expect(back.lon).toBeCloseTo(7.6858, 8)
    expect(back.lat).toBeCloseTo(45.0712, 8)
  })
})
