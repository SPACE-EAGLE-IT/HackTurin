import { NextResponse } from 'next/server'

import { paymentsConfigured, recordPaidSession, stripe } from '@/lib/payments/stripe'

/** Called by the thank-you page: records the session even when the webhook is not reachable (local demo). */
export async function POST(req: Request) {
  if (!paymentsConfigured()) return NextResponse.json({ ok: false }, { status: 503 })
  const { session_id } = (await req.json().catch(() => ({}))) as { session_id?: string }
  if (!session_id?.startsWith('cs_')) return NextResponse.json({ ok: false }, { status: 422 })
  const session = await stripe().checkout.sessions.retrieve(session_id)
  return NextResponse.json({ ok: await recordPaidSession(session) })
}
