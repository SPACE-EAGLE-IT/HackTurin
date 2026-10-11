import { NextResponse } from 'next/server'
import { z } from 'zod'

import { CAPS } from '@/lib/civic/cap'
import {
  ADOPTION_PLANS,
  type AdoptionPlan,
  PARTNER_ETS,
  paymentsConfigured,
  stripe,
} from '@/lib/payments/stripe'
import { createClient } from '@/lib/supabase/server'

const donation = z.object({
  kind: z.literal('donation'),
  amount: z.number().int().min(2).max(5000),
  is_company: z.boolean().default(false),
})
const sponsorship = z.object({
  kind: z.literal('sponsorship'),
  company: z.string().trim().min(2).max(160),
  caps: z
    .array(z.enum(CAPS as [string, ...string[]]))
    .min(1)
    .max(5),
  plan: z.enum(Object.keys(ADOPTION_PLANS) as [AdoptionPlan, ...AdoptionPlan[]]),
})

/** Starts a Stripe Checkout: a donation (anyone) or a zone adoption (a signed-in company). */
export async function POST(req: Request) {
  if (!paymentsConfigured()) {
    return NextResponse.json({ error: 'Pagamenti non ancora attivi' }, { status: 503 })
  }
  const body = await req.json().catch(() => null)
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin

  const d = donation.safeParse(body)
  if (d.success) {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      submit_type: 'donate',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: d.data.amount * 100,
            product_data: {
              name: `Donazione a ${PARTNER_ETS}`,
              description: 'Fondo volontari To.Be',
            },
          },
        },
      ],
      metadata: { kind: 'donation', is_company: String(d.data.is_company) },
      success_url: `${origin}/dona?sessione={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dona`,
    })
    return NextResponse.json({ url: session.url })
  }

  const s = sponsorship.safeParse(body)
  if (!s.success) return NextResponse.json({ error: 'Dati non validi' }, { status: 422 })
  const supabase = await createClient()
  const { data: id, error } = await supabase.rpc('create_pending_sponsorship', {
    p_company: s.data.company,
    p_caps: s.data.caps,
    p_plan: s.data.plan,
  })
  if (error || !id) return NextResponse.json({ error: 'Accedi con l’account dell’azienda' }, { status: 401 })
  const plan = ADOPTION_PLANS[s.data.plan]
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: plan.amount * 100,
          product_data: {
            name: `${plan.label} · CAP ${s.data.caps.join(', ')}`,
            description: s.data.company,
          },
        },
      },
    ],
    metadata: { kind: 'sponsorship', sponsorship_id: id, name: s.data.company, is_company: 'true' },
    success_url: `${origin}/impatto?sessione={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/impatto`,
  })
  return NextResponse.json({ url: session.url })
}
