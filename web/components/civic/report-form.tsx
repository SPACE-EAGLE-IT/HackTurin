'use client'

import { CameraIcon, CheckCircle2Icon, LocateFixedIcon } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'

import { LocationPicker, type LatLon } from '@/components/civic/location-picker'
import { Avviso } from '@/components/ds/avviso'
import { EmptyState } from '@/components/ds/empty-state'
import { FormGrid } from '@/components/ds/form-grid'
import { PropertyField } from '@/components/ds/field-trigger'
import { SectionCard } from '@/components/ds/section-card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CATEGORIES } from '@/lib/civic/categories'

/** Shrinks a photo on the phone (max 1280 px, JPEG) before upload. */
async function shrink(file: File): Promise<string> {
  const img = await createImageBitmap(file)
  const k = Math.min(1, 1280 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = img.width * k
  canvas.height = img.height * k
  canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
}

export function ReportForm() {
  const [category, setCategory] = useState<string>('rifiuti_abbandonati')
  const [where, setWhere] = useState<LatLon | null>(null)
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<{ b64: string; preview: string } | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ deduped: boolean } | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      p => setWhere({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => setError('Posizione non disponibile: tocca la mappa per indicarla.')
    )

  const submit = () =>
    startTransition(async () => {
      if (!where) return setError('Indica dove si trova il problema.')
      setError('')
      const r = await fetch('/api/public/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          ...where,
          description: description || undefined,
          photo_base64: photo?.b64,
        }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok) setDone({ deduped: Boolean(j.deduped) })
      else setError(j.error ?? 'Segnalazione non salvata')
    })

  if (done) {
    return (
      <SectionCard>
        <EmptyState
          icon={CheckCircle2Icon}
          title='Segnalazione inviata'
          description={
            done.deduped
              ? 'Qualcuno l’aveva già segnalata qui vicino: la tua conferma la rende più urgente.'
              : 'Compare subito sulla mappa e arriva agli operatori del Comune.'
          }
          action={
            <Button asChild variant='outline'>
              <Link href='/'>Vai alla mappa</Link>
            </Button>
          }
        />
      </SectionCard>
    )
  }

  return (
    <SectionCard>
      <FormGrid>
        <PropertyField label='Cosa hai visto' span>
          <ToggleGroup
            type='single'
            variant='outline'
            value={category}
            onValueChange={v => v && setCategory(v)}
            className='flex w-full flex-wrap justify-start'
          >
            {CATEGORIES.map(c => (
              <ToggleGroupItem key={c.slug} value={c.slug} className='gap-2'>
                <span aria-hidden className={`size-2 rounded-full ${c.dot}`} />
                {c.name}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </PropertyField>
        <PropertyField label='Dove' span>
          <div className='space-y-2'>
            <Button type='button' variant='outline' size='sm' onClick={locate}>
              <LocateFixedIcon /> Usa la mia posizione
            </Button>
            <LocationPicker value={where} onChange={setWhere} />
            <p className='text-muted-foreground text-xs'>
              {where
                ? `${where.lat.toFixed(5)}, ${where.lon.toFixed(5)}`
                : 'Tocca la mappa per mettere il segnaposto'}
            </p>
          </div>
        </PropertyField>
        <PropertyField label='Dettagli' span>
          <Textarea
            maxLength={500}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder='Es. sacchi e un divano davanti al civico 12'
          />
        </PropertyField>
        <PropertyField label='Foto' span>
          <div className='flex items-center gap-3'>
            <input
              ref={fileRef}
              type='file'
              accept='image/*'
              capture='environment'
              hidden
              onChange={async e => {
                const f = e.target.files?.[0]
                if (f) setPhoto({ b64: await shrink(f), preview: URL.createObjectURL(f) })
              }}
            />
            <Button type='button' variant='outline' size='sm' onClick={() => fileRef.current?.click()}>
              <CameraIcon /> {photo ? 'Cambia foto' : 'Aggiungi foto'}
            </Button>
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo.preview} alt='Anteprima' className='size-14 rounded-md object-cover' />
            )}
          </div>
        </PropertyField>
      </FormGrid>
      {error && (
        <div className='mt-4'>
          <Avviso tono='destructive'>{error}</Avviso>
        </div>
      )}
      <div className='mt-6 flex justify-end'>
        <Button onClick={submit} disabled={pending}>
          {pending && <Spinner />} Invia segnalazione
        </Button>
      </div>
    </SectionCard>
  )
}
