'use client'

import { PlusIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { DialogoAzione } from '@/components/ds/dialogo-azione'
import { DateTrigger, PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { NumberField } from '@/components/ds/number-field'
import { Scelta } from '@/components/ds/scelta'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CAPS } from '@/lib/civic/cap'
import { createProject } from '@/lib/projects/actions'
import type { PersonRef } from '@/lib/tasks/types'

export function NewProjectButton({
  people,
  variant = 'default',
}: {
  people: PersonRef[]
  variant?: 'default' | 'outline'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [ownerId, setOwnerId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<string | undefined>(undefined)
  const [budgetHours, setBudgetHours] = useState<number | null>(null)
  const [caps, setCaps] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const peopleOptions = people.map(person => ({ value: person.id, label: person.full_name }))

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setOwnerId(null)
      setDueDate(undefined)
      setBudgetHours(null)
      setErrors({})
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const input = {
      name: String(form.get('name') ?? ''),
      clientName: String(form.get('clientName') ?? ''),
      ownerId,
      dueDate: dueDate ?? null,
      budgetHours,
      caps,
      notes: String(form.get('notes') ?? ''),
    }
    startTransition(async () => {
      const result = await createProject(input)
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        if (!result.fieldErrors) toast.error(result.message)
        return
      }
      toast.success('Appalto creato')
      setOpen(false)
      router.push(`/projects/${result.data.id}`)
    })
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <PlusIcon /> Nuovo appalto
      </Button>
      <DialogoAzione
        open={open}
        onOpenChange={handleOpenChange}
        natura='creazione'
        titolo='Nuovo appalto'
        azione={{ etichetta: 'Crea appalto', type: 'submit', form: 'new-project', attesa: pending }}
      >
        <form id='new-project' onSubmit={onSubmit}>
          <FormGrid>
            <PropertyField label='Nome' span>
              <Input name='name' required autoFocus maxLength={160} />
              <FieldError message={errors.name} />
            </PropertyField>
            <PropertyField label='CAP coperti' span>
              <Scelta
                multipla
                opzioni={CAPS.map(cap => ({ value: cap, label: cap }))}
                value={caps}
                onValueChange={setCaps}
                cerca='Cerca CAP'
                placeholder='Scegli i CAP della zona'
              />
              <FieldError message={errors.caps} />
            </PropertyField>
            <PropertyField label='Gestore'>
              <Input name='clientName' maxLength={160} placeholder='Es. AMIAT, cooperativa' />
              <FieldError message={errors.clientName} />
            </PropertyField>
            <PropertyField label='Responsabile'>
              <Scelta
                opzioni={peopleOptions}
                value={ownerId}
                onValueChange={setOwnerId}
                azzera='Nessuno'
                cerca='Cerca persona'
                placeholder='Scegli una persona'
              />
              <FieldError message={errors.ownerId} />
            </PropertyField>
            <PropertyField label='Scadenza'>
              <DateTrigger value={dueDate} onChange={setDueDate} placeholder='Scegli una data' />
              <FieldError message={errors.dueDate} />
            </PropertyField>
            <PropertyField label='Budget ore'>
              <NumberField value={budgetHours} onValueChange={setBudgetHours} decimals={0} unit='h' />
              <FieldError message={errors.budgetHours} />
            </PropertyField>
            <PropertyField label='Note' span>
              <Textarea name='notes' rows={3} maxLength={4000} />
              <FieldError message={errors.notes} />
            </PropertyField>
          </FormGrid>
        </form>
      </DialogoAzione>
    </>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className='text-destructive text-xs'>{message}</p>
}
