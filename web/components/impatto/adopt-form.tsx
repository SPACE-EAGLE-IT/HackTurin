'use client'

import { useState, type FormEvent } from 'react'

import { InfoDot } from '@/components/ds/info-dot'
import { Avviso } from '@/components/ds/avviso'
import { PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { Scelta } from '@/components/ds/scelta'
import { SectionCard } from '@/components/ds/section-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CAPS } from '@/lib/civic/cap'
import type { AdoptionPlan } from '@/lib/payments/plans'

const MAX_CAPS = 5
const CAP_OPTIONS = CAPS.map(cap => ({ value: cap, label: cap }))

export type PlanOption = { key: AdoptionPlan; label: string; amount: number }

/** Starts a Stripe Checkout for the adoption of up to five CAPs. */
export function AdoptForm({ defaultCompany, plans }: { defaultCompany: string; plans: PlanOption[] }) {
  const [company, setCompany] = useState(defaultCompany)
  const [caps, setCaps] = useState<string[]>([])
  const [plan, setPlan] = useState<PlanOption['key']>('giornata')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (company.trim().length < 2) return setError('Indica la ragione sociale')
    if (caps.length === 0) return setError('Scegli almeno un CAP')
    setPending(true)
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'sponsorship', company: company.trim(), caps, plan }),
      })
      const body = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (body.url) {
        window.location.assign(body.url)
        return
      }
      setError(body.error ?? 'Pagamento non avviato')
    } catch {
      setError('Pagamento non avviato')
    }
    setPending(false)
  }

  return (
    <SectionCard
      title='Adotta una zona o porta il tuo team'
      info={
        <InfoDot label='Informazioni'>
          {
            'L’importo va all’associazione partner: coordinamento, assicurazione e materiali dei volontari nelle zone scelte.'
          }
        </InfoDot>
      }
    >
      <form onSubmit={onSubmit} className='space-y-4'>
        <FormGrid>
          <PropertyField label='Ragione sociale' span>
            <Input
              value={company}
              onChange={event => setCompany(event.target.value)}
              maxLength={160}
              required
            />
          </PropertyField>
          <PropertyField label='CAP'>
            <Scelta
              multipla
              opzioni={CAP_OPTIONS}
              value={caps}
              onValueChange={value => setCaps(value.slice(0, MAX_CAPS))}
              placeholder='Fino a 5 CAP'
              cerca='Cerca CAP'
            />
          </PropertyField>
          <PropertyField label='Piano' span>
            <ToggleGroup
              type='single'
              variant='outline'
              className='flex w-full flex-wrap justify-start'
              value={plan}
              onValueChange={value => {
                if (value) setPlan(value as PlanOption['key'])
              }}
            >
              {plans.map(option => (
                <ToggleGroupItem key={option.key} value={option.key}>
                  {option.label} · {option.amount.toLocaleString('it-IT')} €
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </PropertyField>
        </FormGrid>
        {error && <Avviso tono='destructive'>{error}</Avviso>}
        <div className='flex justify-end'>
          <Button type='submit' variant='outline' disabled={pending}>
            {pending && <Spinner />} Procedi al pagamento
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}
