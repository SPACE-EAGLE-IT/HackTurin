import { NextResponse } from 'next/server'
import { z } from 'zod'

import { TORINO_BOUNDS as B } from '@/lib/civic/categories'
import { publicReports } from '@/lib/public/queries'
import { createAnonClient } from '@/lib/supabase/anon'

/** Open reports for the public map (polled by the page). */
export async function GET() {
  try {
    return NextResponse.json({ reports: await publicReports() })
  } catch {
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

const schema = z.object({
  category: z.string().min(1).max(40),
  lat: z.number().min(B.minLat).max(B.maxLat),
  lon: z.number().min(B.minLon).max(B.maxLon),
  description: z.string().trim().max(500).optional(),
  photo_base64: z.string().max(7_000_000).optional(),
})

// Per-instance limiter: enough to stop a loop from one browser during the event.
const hits = new Map<string, number[]>()
function limited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < 60_000)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > 6
}

/** A citizen report from the public form: anonymous, rate limited per IP. */
export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  if (limited(ip)) return NextResponse.json({ error: 'Troppe segnalazioni, riprova tra un minuto' }, { status: 429 })
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  const b = parsed.data
  const supabase = createAnonClient()

  let photoUrl: string | undefined
  if (b.photo_base64) {
    const path = `citizen/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`
    const up = await supabase.storage
      .from('report-photos')
      .upload(path, Buffer.from(b.photo_base64, 'base64'), { contentType: 'image/jpeg' })
    if (!up.error) photoUrl = supabase.storage.from('report-photos').getPublicUrl(path).data.publicUrl
  }

  const { data, error } = await supabase.rpc('submit_citizen_report', {
    p_category: b.category,
    p_lat: b.lat,
    p_lon: b.lon,
    p_description: b.description || undefined,
    p_photo_url: photoUrl,
  })
  if (error) return NextResponse.json({ error: 'Segnalazione non salvata' }, { status: 422 })
  return NextResponse.json({ id: data?.[0]?.id, deduped: data?.[0]?.deduped ?? false }, { status: 201 })
}
