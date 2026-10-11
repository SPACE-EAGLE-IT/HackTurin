import { NextResponse } from 'next/server'

import { clientIp, rateLimited } from './limit'
import { secretMatches } from './report'

/**
 * Gate of the voice tool routes: 503 without VOICE_TOOL_SECRET, 401 on a wrong `x-voice-secret`,
 * 429 past the per-minute budget. All calls come from ElevenLabs' servers, so the budget is generous.
 */
export function voiceGuard(req: Request, scope: string, max: number): NextResponse | null {
  const expected = process.env.VOICE_TOOL_SECRET
  if (!expected) return NextResponse.json({ error: 'voice_line_not_configured' }, { status: 503 })
  const ip = clientIp(req)
  if (!secretMatches(req.headers.get('x-voice-secret'), expected)) {
    if (rateLimited(`auth:${ip}`, 30))
      return NextResponse.json({ error: 'too_many_requests' }, { status: 429 })
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (rateLimited(`${scope}:${ip}`, max)) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'rate_limited',
        message: 'Troppe richieste in questo momento, riprova tra un minuto.',
      },
      { status: 429 }
    )
  }
  return null
}
