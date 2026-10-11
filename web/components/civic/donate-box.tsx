'use client'

import { CheckCircle2Icon } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'

import { Avviso } from '@/components/ds/avviso'
import { Interruttore } from '@/components/ds/interruttore'
import { NumberField } from '@/components/ds/number-field'
import { SectionCard } from '@/components/ds/section-card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const PRESETS = [5, 10, 25, 50]

export function DonateBox({ enabled, sessionId }: { enabled: boolean; sessionId?: string }) {
  const [amount, setAmount] = useState<number | null>(10)
  const [company, setCompany] = useState(false)
  const [error, setError] = useState('')
  const [thanks, setThanks] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!sessionId) return
    fetch('/api/stripe/confirm', { method: 'POST', body: JSON.stringify({ session_id: sessionId }) })
      .then(r => r.json())
      .then(j => setThanks(Boolean(j.ok)))
      .catch(() => {})
  }, [sessionId])

  const donate = () =>
    startTransition(async () => {
      setError('')
      const r = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'donation', amount, is_company: company }),
      })
      const j = await r.json().catch(() => ({}))
      if (j.url) window.location.href = j.url
      else setError(j.error ?? 'Pagamento non disponibile')
    })

  return (
    <SectionCard title='Fai una donazione'>
      <div className='space-y-4'>
        {thanks && (
          <Avviso tono='success'>
            <CheckCircle2Icon className='mr-1 inline size-4' /> Grazie! La donazione è registrata nel fondo.
          </Avviso>
        )}
        {!enabled && <Avviso tono='info'>I pagamenti online si attivano a breve.</Avviso>}
        <ToggleGroup
          type='single'
          variant='outline'
          value={String(amount)}
          onValueChange={v => v && setAmount(Number(v))}
          className='flex flex-wrap justify-start'
        >
          {PRESETS.map(p => (
            <ToggleGroupItem key={p} value={String(p)}>
              {p} €
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <NumberField value={amount} onValueChange={setAmount} unit='€' placeholder='Altro importo' />
        <Interruttore etichetta='Dono come azienda' acceso={company} onAcceso={setCompany} />
        {error && <Avviso tono='destructive'>{error}</Avviso>}
        <div className='flex justify-end'>
          <Button onClick={donate} disabled={!enabled || pending || !amount || amount < 2}>
            {pending && <Spinner />} Dona {amount ?? ''} €
          </Button>
        </div>
      </div>
    </SectionCard>
  )
}
