import Stripe from 'stripe'

import { createAnonClient } from '@/lib/supabase/anon'

export { ADOPTION_PLANS, type AdoptionPlan, planLabel, planShort } from './plans'

export const PARTNER_ETS = process.env.PARTNER_ETS_NAME ?? 'Space Eagle ETS'

export const paymentsConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.PAYMENT_BRIDGE_SECRET)

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is missing')
  return new Stripe(key)
}

/** Records a paid Checkout session through the database entry point (idempotent on the session id). */
export async function recordPaidSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return false
  const meta = session.metadata ?? {}
  const { error } = await createAnonClient().rpc('record_payment', {
    p_secret: process.env.PAYMENT_BRIDGE_SECRET ?? '',
    p_kind: meta.kind ?? '',
    p_session_id: session.id,
    p_amount: (session.amount_total ?? 0) / 100,
    p_email: session.customer_details?.email ?? '',
    p_name: session.customer_details?.name ?? meta.name ?? '',
    p_is_company: meta.is_company === 'true',
    p_sponsorship_id: meta.sponsorship_id || null,
  })
  return !error
}
