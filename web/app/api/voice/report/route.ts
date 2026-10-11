import { NextResponse } from 'next/server'

import { geocodeTorino } from '@/lib/civic/geocode'
import { createAnonClient } from '@/lib/supabase/anon'
import { voiceGuard } from '@/lib/voice/guard'
import { handleVoiceReport, voiceReportSchema } from '@/lib/voice/report'

/**
 * Server tool of the ElevenLabs voice agent («numero verde»): one report from a phone call.
 * The caller's number never reaches this route, and nothing about the caller is stored.
 */
export async function POST(req: Request) {
  const blocked = voiceGuard(req, 'report', 20)
  if (blocked) return blocked
  const parsed = voiceReportSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'invalid_input',
        message: 'Mi servono il tipo di problema, il luogo esatto e una breve descrizione.',
      },
      { status: 422 }
    )
  }

  const supabase = createAnonClient()
  const result = await handleVoiceReport(parsed.data, {
    geocode: geocodeTorino,
    submit: async r => {
      const { data, error } = await supabase.rpc('submit_citizen_report', {
        p_category: r.category,
        p_lat: r.lat,
        p_lon: r.lon,
        p_description: r.description,
      })
      const row = data?.[0]
      return error || !row ? null : { id: row.id, deduped: row.deduped }
    },
  })
  // 200 even on a failure: the agent reads `message` aloud and asks again instead of erroring out.
  return NextResponse.json(result, { status: result.ok ? 201 : 200 })
}
