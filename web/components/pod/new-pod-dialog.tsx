'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { DialogoAzione } from '@/components/ds/dialogo-azione'
import { PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { Scelta } from '@/components/ds/scelta'
import { KeyRevealDialog } from '@/components/pod/key-reveal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createDevice } from '@/lib/pod/actions'
import { DEVICE_TYPES, deviceTypeLabel, type DeviceType } from '@/lib/pod/types'

const FORM_ID = 'new-pod'
const TYPE_OPTIONS = DEVICE_TYPES.map(type => ({ value: type, label: deviceTypeLabel(type) }))

type Draft = { name: string; type: DeviceType; label: string; keyLabel: string }
const PLACEHOLDER: Record<DeviceType, string> = {
  fixed: 'Corso Vittorio Emanuele II',
  mobile: 'Bus linea 4',
  phone: 'Camion AMIAT 12',
}

const EMPTY: Draft = { name: '', type: 'fixed', label: '', keyLabel: '' }

export function NewPodButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [createdType, setCreatedType] = useState<DeviceType>('fixed')
  const [pending, startTransition] = useTransition()

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(current => ({ ...current, [key]: value }))

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      setDraft(EMPTY)
      setErrors({})
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const type = draft.type
    startTransition(async () => {
      const result = await createDevice(draft)
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        if (!result.fieldErrors) toast.error(result.message)
        return
      }
      toast.success('POD creato')
      onOpenChange(false)
      setCreatedType(type)
      setApiKey(result.data.apiKey)
      router.refresh()
    })
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <PlusIcon /> Nuovo POD
      </Button>
      <DialogoAzione
        open={open}
        onOpenChange={onOpenChange}
        titolo='Nuovo POD'
        natura='creazione'
        azione={{ etichetta: 'Crea POD', type: 'submit', form: FORM_ID, attesa: pending }}
      >
        <form id={FORM_ID} onSubmit={onSubmit}>
          <FormGrid>
            <PropertyField label='Nome' span>
              <Input
                value={draft.name}
                onChange={event => update('name', event.target.value)}
                placeholder='Semaforo Porta Nuova'
                autoFocus
                required
                maxLength={80}
                aria-invalid={errors.name ? true : undefined}
              />
              <FieldError message={errors.name} />
            </PropertyField>
            <PropertyField label='Tipo'>
              <Scelta
                opzioni={TYPE_OPTIONS}
                value={draft.type}
                onValueChange={value => update('type', value as DeviceType)}
              />
            </PropertyField>
            <PropertyField label='Posizione o mezzo'>
              <Input
                value={draft.label}
                onChange={event => update('label', event.target.value)}
                placeholder={PLACEHOLDER[draft.type]}
                maxLength={160}
              />
              <FieldError message={errors.label} />
            </PropertyField>
            <PropertyField label='Nota sulla chiave' span>
              <Input
                value={draft.keyLabel}
                onChange={event => update('keyLabel', event.target.value)}
                placeholder='Team hardware - prototipo'
                maxLength={120}
              />
              <p className='text-muted-foreground text-xs'>
                La chiave API si vede una sola volta, dopo la creazione.
              </p>
              <FieldError message={errors.keyLabel} />
            </PropertyField>
          </FormGrid>
        </form>
      </DialogoAzione>
      <KeyRevealDialog apiKey={apiKey} deviceType={createdType} onClose={() => setApiKey(null)} />
    </>
  )
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className='text-destructive text-xs'>{message}</p>
}
