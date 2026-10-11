// WGS84 <-> UTM (northern hemisphere) with Krüger's series to n^3 (Karney 2011): sub-millimetre inside a zone,
// enough to address 10-60 m Sentinel-2 pixels without pulling in proj4.

const A_AXIS = 6378137
const F = 1 / 298.257223563
const K0 = 0.9996
const E0 = 500000
const N_ = F / (2 - F)
const A = (A_AXIS / (1 + N_)) * (1 + N_ ** 2 / 4 + N_ ** 4 / 64)
const ALPHA = [N_ / 2 - (2 * N_ ** 2) / 3 + (5 * N_ ** 3) / 16, (13 * N_ ** 2) / 48 - (3 * N_ ** 3) / 5, (61 * N_ ** 3) / 240]
const BETA = [N_ / 2 - (2 * N_ ** 2) / 3 + (37 * N_ ** 3) / 96, N_ ** 2 / 48 + N_ ** 3 / 15, (17 * N_ ** 3) / 480]
const DELTA = [2 * N_ - (2 * N_ ** 2) / 3 - 2 * N_ ** 3, (7 * N_ ** 2) / 3 - (8 * N_ ** 3) / 5, (56 * N_ ** 3) / 15]
const E2N = (2 * Math.sqrt(N_)) / (1 + N_)

const rad = (d: number) => (d * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI
const centralMeridian = (zone: number) => rad(zone * 6 - 183)

/** Longitude/latitude (degrees, WGS84) to UTM easting/northing in metres; zone 32 = EPSG:32632. */
export function lonLatToUtm(lon: number, lat: number, zone = 32): { x: number; y: number } {
  const phi = rad(lat)
  const dl = rad(lon) - centralMeridian(zone)
  const t = Math.sinh(Math.atanh(Math.sin(phi)) - E2N * Math.atanh(E2N * Math.sin(phi)))
  const xi1 = Math.atan2(t, Math.cos(dl))
  const eta1 = Math.atanh(Math.sin(dl) / Math.sqrt(1 + t * t))
  let xi = xi1
  let eta = eta1
  ALPHA.forEach((a, i) => {
    const j = 2 * (i + 1)
    xi += a * Math.sin(j * xi1) * Math.cosh(j * eta1)
    eta += a * Math.cos(j * xi1) * Math.sinh(j * eta1)
  })
  return { x: E0 + K0 * A * eta, y: K0 * A * xi }
}

/** UTM easting/northing (metres, northern hemisphere) back to longitude/latitude in degrees. */
export function utmToLonLat(x: number, y: number, zone = 32): { lon: number; lat: number } {
  const xi = y / (K0 * A)
  const eta = (x - E0) / (K0 * A)
  let xi1 = xi
  let eta1 = eta
  BETA.forEach((b, i) => {
    const j = 2 * (i + 1)
    xi1 -= b * Math.sin(j * xi) * Math.cosh(j * eta)
    eta1 -= b * Math.cos(j * xi) * Math.sinh(j * eta)
  })
  const chi = Math.asin(Math.sin(xi1) / Math.cosh(eta1))
  let phi = chi
  DELTA.forEach((d, i) => (phi += d * Math.sin(2 * (i + 1) * chi)))
  return { lon: deg(centralMeridian(zone) + Math.atan2(Math.sinh(eta1), Math.cos(xi1))), lat: deg(phi) }
}
