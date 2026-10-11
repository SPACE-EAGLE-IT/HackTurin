import { categoryName } from '@/lib/civic/categories'
import { haversine } from '@/lib/civic/geo'

export const ZONE_RADIUS_M = 300

type Point = { lat: number; lon: number; category: string; status: string }

/** Open reports within the radius of a place, per category, and the Italian sentence the agent reads. */
export function summarizeZone(center: { lat: number; lon: number }, label: string, reports: Point[]) {
  const near = reports.filter(
    r =>
      (r.status === 'open' || r.status === 'in_progress') &&
      haversine([center.lon, center.lat], [r.lon, r.lat]) <= ZONE_RADIUS_M
  )
  const byCategory: Record<string, number> = {}
  for (const r of near) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
  const parts = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${n} ${categoryName(c).toLowerCase()}`)
  const message =
    near.length === 0
      ? `Al momento non ci sono segnalazioni aperte entro ${ZONE_RADIUS_M} metri da ${label}.`
      : `Entro ${ZONE_RADIUS_M} metri da ${label} ci sono ${near.length} ${
          near.length === 1 ? 'segnalazione aperta' : 'segnalazioni aperte'
        }: ${parts.join(', ')}.`
  return { open_reports: near.length, by_category: byCategory, message }
}
