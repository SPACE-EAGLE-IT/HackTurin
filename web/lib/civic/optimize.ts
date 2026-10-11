import { haversine } from './geo'

export type Stop = { id: string; lon: number; lat: number; severity: number }
type P = [number, number]

const pt = (s: Stop): P => [s.lon, s.lat]
// Streets are longer than the straight line: empirical urban factor.
const D = (a: P, b: P) => haversine(a, b) * 1.3

export function tourLength(depot: P, order: Stop[]) {
  let total = 0
  let cur = depot
  for (const s of order) {
    total += D(cur, pt(s))
    cur = pt(s)
  }
  return total + D(cur, depot)
}

/** Nearest neighbour biased towards severe stops, then 2-opt. */
export function solveTour(depot: P, stops: Stop[]): Stop[] {
  const left = [...stops]
  const order: Stop[] = []
  let cur = depot
  while (left.length) {
    let bi = 0
    let bs = Infinity
    left.forEach((s, i) => {
      const score = D(cur, pt(s)) / (1 + 0.12 * (s.severity - 1))
      if (score < bs) {
        bs = score
        bi = i
      }
    })
    const [next] = left.splice(bi, 1)
    order.push(next)
    cur = pt(next)
  }
  let improved = true
  let guard = 0
  while (improved && guard++ < 60) {
    improved = false
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const cand = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)]
        if (tourLength(depot, cand) < tourLength(depot, order) - 1) {
          order.splice(0, order.length, ...cand)
          improved = true
        }
      }
    }
  }
  return order
}

/** Splits stops into k compact groups (k-means seeded by angular sectors around the depot). */
export function splitStops(depot: P, stops: Stop[], k: number): Stop[][] {
  if (k <= 1) return [stops]
  if (stops.length <= k) return stops.map(s => [s])
  const angle = (s: Stop) => Math.atan2(s.lat - depot[1], s.lon - depot[0])
  const sorted = [...stops].sort((a, b) => angle(a) - angle(b))
  let centers: P[] = Array.from({ length: k }, (_, i) =>
    pt(sorted[Math.floor(((i + 0.5) * sorted.length) / k)])
  )
  let groups: Stop[][] = []
  for (let it = 0; it < 15; it++) {
    groups = Array.from({ length: k }, () => [])
    for (const s of stops) {
      let bi = 0
      let bd = Infinity
      centers.forEach((c, i) => {
        const d = haversine(pt(s), c)
        if (d < bd) {
          bd = d
          bi = i
        }
      })
      groups[bi].push(s)
    }
    centers = groups.map((g, i) =>
      g.length
        ? ([g.reduce((a, s) => a + s.lon, 0) / g.length, g.reduce((a, s) => a + s.lat, 0) / g.length] as P)
        : centers[i]
    )
  }
  return groups.filter(g => g.length)
}

/** Distance and time of a tour: ~22 km/h in town plus 4 minutes per stop. */
export function tourStats(depot: P, order: Stop[]) {
  const meters = tourLength(depot, order)
  return { km: meters / 1000, minutes: (meters / 1000 / 22) * 60 + order.length * 4 }
}
