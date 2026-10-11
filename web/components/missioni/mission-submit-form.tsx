'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { NumberField } from '@/components/ds/number-field'
import { SectionCard } from '@/components/ds/section-card'
import { compressPhoto } from '@/components/missioni/compress-photo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { submitMission } from '@/lib/missioni/actions'

const ACCEPT = 'image/jpeg,image/png,image/webp'

/** The assigned volunteer reports the outcome: before/after photos, hours, kg and a note. */
export function MissionSubmitForm({
  missionId,
  hours: initialHours,
  kg: initialKg,
  note: initialNote,
  hasAfterPhoto,
}: {
  missionId: string
  hours: number | null
  kg: number | null
  note: string | null
  hasAfterPhoto: boolean
}) {
  const router = useRouter()
  const [before, setBefore] = useState<File | null>(null)
  const [after, setAfter] = useState<File | null>(null)
  const [hours, setHours] = useState<number | null>(initialHours)
  const [kg, setKg] = useState<number | null>(initialKg)
  const [note, setNote] = useState(initialNote ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!after && !hasAfterPhoto) {
      setErrors({ photoAfter: 'Serve la foto dopo' })
      return
    }
    startTransition(async () => {
      setErrors({})
      setMessage(null)
      const data = new FormData()
      data.set('missionId', missionId)
      if (hours !== null) data.set('hours', String(hours))
      if (kg !== null) data.set('kg', String(kg))
      data.set('note', note)
      if (before) data.set('photoBefore', await compressPhoto(before))
      if (after) data.set('photoAfter', await compressPhoto(after))
      const result = await submitMission(data)
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        if (!result.fieldErrors) setMessage(result.message)
        return
      }
      toast.success('Missione inviata per la verifica')
      router.refresh()
    })
  }

  return (
    <SectionCard
      title='Esito della missione'
      info='Le ore attestano l’attività svolta: non sono una base di pagamento.'
    >
      <form onSubmit={onSubmit}>
        <FormGrid>
          <PropertyField label='Foto prima'>
            <Input
              type='file'
              accept={ACCEPT}
              onChange={event => setBefore(event.target.files?.[0] ?? null)}
            />
            <FieldError message={errors.photoBefore} />
          </PropertyField>
          <PropertyField label='Foto dopo'>
            <Input
              type='file'
              accept={ACCEPT}
              onChange={event => setAfter(event.target.files?.[0] ?? null)}
            />
            <FieldError message={errors.photoAfter} />
          </PropertyField>
          <PropertyField label='Ore'>
            <NumberField value={hours} onValueChange={setHours} decimals={1} unit='h' />
            <FieldError message={errors.hours} />
          </PropertyField>
          <PropertyField label='Kg raccolti'>
            <NumberField value={kg} onValueChange={setKg} decimals={1} unit='kg' />
            <FieldError message={errors.kg} />
          </PropertyField>
          <PropertyField label='Nota' span>
            <Textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              rows={3}
              maxLength={2000}
            />
            <FieldError message={errors.note} />
          </PropertyField>
        </FormGrid>
        {message && <p className='text-destructive mt-3 text-sm'>{message}</p>}
        <div className='mt-4 flex justify-end'>
          <Button type='submit' variant='outline' disabled={pending}>
            {pending && <Spinner />} Invia per verifica
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className='text-destructive text-xs'>{message}</p>
}
