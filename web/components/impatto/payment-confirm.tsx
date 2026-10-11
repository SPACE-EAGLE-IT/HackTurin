'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Avviso } from '@/components/ds/avviso'

/** Back from Stripe with `?sessione=`: records the payment once (idempotent), then cleans the URL. */
export function PaymentConfirm({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const sent = useRef(false)
  const [state, setState] = useState<'pending' | 'ok' | 'error'>('pending')

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    fetch('/api/stripe/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId }),
    })
      .then(response => response.json() as Promise<{ ok?: boolean }>)
      .then(body => {
        setState(body.ok ? 'ok' : 'error')
        router.replace('/impatto', { scroll: false })
        router.refresh()
      })
      .catch(() => setState('error'))
  }, [router, sessionId])

  if (state === 'pending') return <Avviso tono='info'>Conferma del pagamento in corso…</Avviso>
  if (state === 'ok') return <Avviso tono='success'>Pagamento ricevuto: l’adozione è attiva.</Avviso>
  return (
    <Avviso tono='warning'>
      Pagamento non ancora confermato: l’adozione si attiva appena arriva la conferma di Stripe.
    </Avviso>
  )
}
