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
import { createCategory } from '@/lib/help-desk/actions'

export function NewCategoryButton() {
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
    const name = String(form.get('name') ?? '')
    const description = String(form.get('description') ?? '').trim()
    startTransition(async () => {
      const result = await createCategory({ name, description: description || null })
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        if (!result.fieldErrors) toast.error(result.message)
        return
      }
      toast.success('Categoria creata')
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon /> Nuova categoria
      </Button>
      <DialogoAzione
        open={open}
        onOpenChange={handleOpenChange}
        natura='gesto'
        titolo='Nuova categoria'
        azione={{ etichetta: 'Crea categoria', type: 'submit', form: 'new-category', attesa: pending }}
      >
        <form id='new-category' onSubmit={onSubmit}>
          <FormGrid>
            <PropertyField label='Nome' span>
              <Input name='name' required autoFocus maxLength={60} />
              {errors.name && <p className='text-destructive text-xs'>{errors.name}</p>}
            </PropertyField>
            <PropertyField label='Descrizione' span>
              <Input name='description' maxLength={200} />
              {errors.description && <p className='text-destructive text-xs'>{errors.description}</p>}
            </PropertyField>
          </FormGrid>
        </form>
      </DialogoAzione>
    </>
  )
}
