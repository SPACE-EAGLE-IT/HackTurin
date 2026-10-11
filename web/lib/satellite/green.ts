import type { StatusTone } from '@/components/ds/status-badge'

/** Plain-language green cover from a zone's mean NDVI (urban rule of thumb, not a land-use class). */
export function greenBand(ndvi: number | null | undefined): { label: string; tone: StatusTone } {
  if (ndvi == null) return { label: 'n/d', tone: 'muted' }
  if (ndvi < 0.2) return { label: 'Poco verde', tone: 'warning' }
  if (ndvi < 0.35) return { label: 'Verde medio', tone: 'info' }
  return { label: 'Molto verde', tone: 'success' }
}

/** NDVI shown as a 0–100 "indice verde" so a ranking reads naturally. */
export const greenIndex = (ndvi: number | null | undefined) =>
  ndvi == null ? 0 : Math.max(0, Math.round(ndvi * 100))
