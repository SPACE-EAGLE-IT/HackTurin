'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { Interruttore } from '@/components/ds/interruttore'
import { SectionCard } from '@/components/ds/section-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { enrolVolunteer } from '@/lib/missioni/actions'

/** Self-enrolment: ETS membership, insurance and the optional reference of the collaboration pact. */
export function EnrolmentCard({
  member: initialMember,
  insured: initialInsured,
  pattoRef: initialPatto,
}: {
  member: boolean
  insured: boolean
  pattoRef: string | null
}) {
  const router = useRouter()
  const [member, setMember] = useState(initialMember)
  const [insured, setInsured] = useState(initialInsured)
  const [pattoRef, setPattoRef] = useState(initialPatto ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      setError(null)
      const result = await enrolVolunteer({ member, insured, pattoRef })
      if (!result.ok) {
        setError(result.fieldErrors?.pattoRef ?? result.message)
        return
      }
      toast.success(member && insured ? 'Iscrizione completata' : 'Iscrizione salvata')
      router.refresh()
    })

  return (
    <SectionCard
      title='Iscrizione come volontario'
      info='Le missioni si svolgono nel patto di collaborazione tra Comune e associazione partner: servono iscrizione e copertura assicurativa.'
    >
      <FormGrid>
        <PropertyField label='Associazione partner' span>
          <Interruttore
            etichetta='Sono iscritto all’associazione partner (ETS)'
            acceso={member}
            onAcceso={setMember}
          />
        </PropertyField>
        <PropertyField label='Assicurazione' span>
          <Interruttore
            etichetta='Sono coperto dall’assicurazione dei volontari'
            descrizione='Infortuni e responsabilità civile, a carico dell’associazione.'
            acceso={insured}
            onAcceso={setInsured}
          />
        </PropertyField>
        <PropertyField label='Riferimento del patto' span>
          <Input
            value={pattoRef}
            onChange={event => setPattoRef(event.target.value)}
            maxLength={80}
            placeholder='Facoltativo'
          />
          {error && <p className='text-destructive text-xs'>{error}</p>}
        </PropertyField>
      </FormGrid>
      <div className='mt-4 flex justify-end'>
        <Button onClick={save} disabled={pending}>
          {pending && <Spinner />} Salva iscrizione
        </Button>
      </div>
    </SectionCard>
  )
}
