'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { DialogoAzione } from '@/components/ds/dialogo-azione'
import { DateTrigger, PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createMission } from '@/lib/missioni/actions'

const FORM_ID = 'new-mission'

export function NewMissionButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<string | undefined>()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const reset = () => {
    setTitle('')
    setDescription('')
    setDueDate(undefined)
    setErrors({})
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startTransition(async () => {
      const result = await createMission({ title, description, dueDate: dueDate ?? null })
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        if (!result.fieldErrors) toast.error(result.message)
        return
      }
      toast.success('Missione creata')
      setOpen(false)
      reset()
      router.push(`/missioni/${result.data.id}`)
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon /> Nuova missione
      </Button>
      <DialogoAzione
        open={open}
        onOpenChange={next => {
          setOpen(next)
          if (!next) reset()
        }}
        titolo='Nuova missione'
        natura='creazione'
        azione={{ etichetta: 'Crea missione', type: 'submit', form: FORM_ID, attesa: pending }}
      >
        <form id={FORM_ID} onSubmit={onSubmit}>
          <FormGrid>
            <PropertyField label='Titolo' span>
              <Input
                value={title}
                onChange={event => setTitle(event.target.value)}
                autoFocus
                required
                maxLength={200}
                aria-invalid={errors.title ? true : undefined}
              />
              {errors.title && <p className='text-destructive text-xs'>{errors.title}</p>}
            </PropertyField>
            <PropertyField label='Descrizione' span>
              <Textarea
                value={description}
                onChange={event => setDescription(event.target.value)}
                rows={4}
                maxLength={4000}
              />
            </PropertyField>
            <PropertyField label='Scadenza'>
              <DateTrigger value={dueDate} onChange={setDueDate} placeholder='Scegli una data' />
              {errors.dueDate && <p className='text-destructive text-xs'>{errors.dueDate}</p>}
            </PropertyField>
          </FormGrid>
        </form>
      </DialogoAzione>
    </>
  )
}
