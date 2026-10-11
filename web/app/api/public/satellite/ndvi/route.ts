import { ndviOverlayPng } from '@/lib/satellite/sentinel'

export const maxDuration = 60

// Memoised per instance; the CDN keeps the image for 12 h, like the zone numbers.
let memo: { at: number; value: Awaited<ReturnType<typeof ndviOverlayPng>> } | null = null

/** The NDVI image of the latest clear Sentinel-2 scene over the city, as a transparent PNG. */
export async function GET() {
  if (!memo || Date.now() - memo.at > 43_200_000) {
    memo = { at: Date.now(), value: await ndviOverlayPng().catch(() => null) }
    if (!memo.value) memo = null
  }
  const v = memo?.value
  if (!v) return new Response('Immagine non disponibile', { status: 503 })
  return new Response(new Uint8Array(v.png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=3600, s-maxage=43200, stale-while-revalidate=86400',
      'X-Scene': v.sceneId,
    },
  })
}
