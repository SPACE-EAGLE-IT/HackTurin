import { NextResponse } from 'next/server'
import { z } from 'zod'

import { geocodeTorino } from '@/lib/civic/geocode'
import { publicReports } from '@/lib/public/queries'
import { voiceGuard } from '@/lib/voice/guard'
import { normalizeAddress } from '@/lib/voice/normalize'
import { summarizeZone } from '@/lib/voice/zone'

const schema = z.object({ address: z.string().trim().min(2).max(200) })

/** Server tool of the voice agent: «com'è la situazione in via X?» → open reports nearby. Read only. */
export async function POST(req: Request) {
  const blocked = voiceGuard(req, 'zone', 30)
  if (blocked) return blocked
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_input', message: 'Di quale via o zona vuoi sapere?' },
      { status: 422 }
    )
  }
  const place = await geocodeTorino(normalizeAddress(parsed.data.address))
  if (!place) {
    return NextResponse.json({
      ok: false,
      reason: 'address_not_found',
      message:
        'Non ho trovato questo indirizzo a Torino. Puoi ripetere la via o indicare un luogo noto vicino?',
    })
  }
  try {
    const summary = summarizeZone(place, place.label, await publicReports())
    return NextResponse.json({ ok: true, address_found: place.label, ...summary })
  } catch {
    return NextResponse.json({
      ok: false,
      reason: 'server_error',
      message: 'Non riesco a leggere le segnalazioni in questo momento, riprova più tardi.',
    })
  }
}
