import { NextResponse } from 'next/server'
import type Stripe from 'stripe'

import { recordPaidSession, stripe } from '@/lib/payments/stripe'

/** Stripe → database: a completed Checkout becomes a donation or an active adoption. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  const signature = req.headers.get('stripe-signature')
  if (!secret || !signature) return NextResponse.json({ error: 'not_configured' }, { status: 400 })
  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret)
  } catch {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }
  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    await recordPaidSession(event.data.object)
  }
  return NextResponse.json({ received: true })
}
