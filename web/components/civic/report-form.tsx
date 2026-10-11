'use client'

import { CameraIcon, CheckCircle2Icon, LocateFixedIcon, MapPinIcon } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

import { LocationPicker, type LatLon } from '@/components/civic/location-picker'
import { Avviso } from '@/components/ds/avviso'
import { EmptyState } from '@/components/ds/empty-state'
import { FormGrid } from '@/components/ds/form-grid'
import { PropertyField } from '@/components/ds/field-trigger'
import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CATEGORIES, TORINO_BOUNDS } from '@/lib/civic/categories'

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

type Fix = { state: 'idle' | 'locating' | 'ok' | 'manual' | 'error'; accuracy?: number; message?: string }

const GEO_ERRORS: Record<number, string> = {
  1: 'Accesso alla posizione negato: attivalo nelle impostazioni del browser, oppure tocca la mappa.',
  2: 'Posizione non disponibile qui: tocca la mappa per indicarla.',
  3: 'Il GPS ci mette troppo: tocca la mappa per indicarla.',
}

const insideTorino = (p: LatLon) =>
  p.lat >= TORINO_BOUNDS.minLat &&
  p.lat <= TORINO_BOUNDS.maxLat &&
  p.lon >= TORINO_BOUNDS.minLon &&
  p.lon <= TORINO_BOUNDS.maxLon

/** Street address of a point (OpenStreetMap Nominatim), or null. */
async function addressOf(p: LatLon, signal: AbortSignal): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=it&lat=${p.lat}&lon=${p.lon}`
  const r = await fetch(url, { signal }).catch(() => null)
  if (!r?.ok) return null
  const j = (await r.json().catch(() => null)) as {
    address?: Record<string, string>
  } | null
  const a = j?.address
  if (!a) return null
  const street = a.road ?? a.pedestrian ?? a.square ?? a.footway ?? a.neighbourhood ?? a.suburb
  return [street && [street, a.house_number].filter(Boolean).join(' '), a.postcode].filter(Boolean).join(', ')
}

export function ReportForm() {
  const [category, setCategory] = useState<string>('rifiuti_abbandonati')
  const [where, setWhere] = useState<LatLon | null>(null)
  const [fix, setFix] = useState<Fix>({ state: 'idle' })
  const [address, setAddress] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [photo, setPhoto] = useState<{ b64: string; preview: string } | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ deduped: boolean } | null>(null)
  const [pending, startTransition] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const watch = useRef<number | null>(null)

  const stopWatch = () => {
    if (watch.current != null) navigator.geolocation?.clearWatch(watch.current)
    watch.current = null
  }

  // Follows the GPS for a few seconds and keeps the most precise fix; a tap on the map wins.
  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setFix({ state: 'error', message: 'Questo browser non condivide la posizione: tocca la mappa.' })
      return
    }
    stopWatch()
    setFix({ state: 'locating' })
    let best = Infinity
    watch.current = navigator.geolocation.watchPosition(
      p => {
        if (p.coords.accuracy >= best) return
        best = p.coords.accuracy
        setWhere({ lat: p.coords.latitude, lon: p.coords.longitude })
        setFix({ state: 'ok', accuracy: Math.round(p.coords.accuracy) })
        if (best <= 15) stopWatch()
      },
      e => {
        stopWatch()
        setFix(f => (f.state === 'ok' ? f : { state: 'error', message: GEO_ERRORS[e.code] }))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )
    window.setTimeout(stopWatch, 12000)
  }, [])

  // Ask for the position as soon as the form opens: most reports are made on the spot.
  useEffect(() => {
    const id = window.setTimeout(locate, 0)
    return () => {
      window.clearTimeout(id)
      stopWatch()
    }
  }, [locate])

  useEffect(() => {
    if (!where) return
    const ctl = new AbortController()
    const id = window.setTimeout(
      () => void addressOf(where, ctl.signal).then(a => !ctl.signal.aborted && setAddress(a)),
      600
    )
    return () => {
      window.clearTimeout(id)
      ctl.abort()
    }
  }, [where])

  const pick = (p: LatLon) => {
    stopWatch()
    setWhere(p)
    setFix({ state: 'manual' })
  }

  const submit = () =>
    startTransition(async () => {
      if (!where) return setError('Indica dove si trova il problema.')
      if (!insideTorino(where)) return setError('Il punto è fuori dal territorio di Torino.')
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
            <div className='flex flex-wrap items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={locate}
                disabled={fix.state === 'locating'}
              >
                {fix.state === 'locating' ? <Spinner /> : <LocateFixedIcon />}
                {fix.state === 'locating' ? 'Cerco la posizione…' : 'Usa la mia posizione'}
              </Button>
              {fix.state === 'ok' && (
                <StatusBadge tone={(fix.accuracy ?? 99) <= 30 ? 'success' : 'warning'}>
                  GPS ±{fix.accuracy} m
                </StatusBadge>
              )}
              {fix.state === 'manual' && <StatusBadge tone='muted'>Punto scelto sulla mappa</StatusBadge>}
            </div>
            {fix.state === 'error' && <Avviso tono='warning'>{fix.message}</Avviso>}
            <LocationPicker
              value={where}
              onChange={pick}
              accuracy={fix.state === 'ok' ? fix.accuracy : null}
            />
            <p className='text-muted-foreground flex items-center gap-1.5 text-xs'>
              <MapPinIcon className='size-3.5 shrink-0' />
              {where
                ? (address ?? `${where.lat.toFixed(5)}, ${where.lon.toFixed(5)}`)
                : 'Tocca la mappa per mettere il segnaposto'}
              {where && ' · trascina il segnaposto per correggere'}
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
