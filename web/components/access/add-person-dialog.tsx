'use client'

import { PlusIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { type FormEvent, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { DialogoAzione } from '@/components/ds/dialogo-azione'
import { PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createPerson } from '@/lib/access/actions'

export function AddPersonButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setErrors({})
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const fullName = String(form.get('fullName') ?? '')
    const email = String(form.get('email') ?? '').trim()
    startTransition(async () => {
      const result = await createPerson({ fullName, email: email || null })
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        if (!result.fieldErrors) toast.error(result.message)
        return
      }
      toast.success('Persona aggiunta')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon /> Aggiungi persona
      </Button>
      <DialogoAzione
        open={open}
        onOpenChange={handleOpenChange}
        natura='gesto'
        titolo='Aggiungi persona'
        azione={{ etichetta: 'Aggiungi persona', type: 'submit', form: 'add-person', attesa: pending }}
      >
        <form id='add-person' onSubmit={onSubmit}>
          <FormGrid cols={1}>
            <PropertyField label='Nome e cognome'>
              <Input name='fullName' required autoFocus maxLength={120} />
              {errors.fullName && <p className='text-destructive text-xs'>{errors.fullName}</p>}
            </PropertyField>
            <PropertyField label='E-mail'>
              <Input name='email' type='email' autoComplete='off' />
              {errors.email ? (
                <p className='text-destructive text-xs'>{errors.email}</p>
              ) : (
                <p className='text-muted-foreground text-xs'>
                  Chi si registra con questa e-mail prende questo profilo.
                </p>
              )}
            </PropertyField>
          </FormGrid>
        </form>
      </DialogoAzione>
    </>
  )
}
