'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRoundIcon, PauseIcon, PlayIcon } from 'lucide-react'
import { toast } from 'sonner'

import { DialogoAzione } from '@/components/ds/dialogo-azione'
import { PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { KeyRevealDialog } from '@/components/pod/key-reveal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { createKey, setDeviceActive } from '@/lib/pod/actions'
import { toastConAnnulla } from '@/lib/toast-annulla'

const FORM_ID = 'new-pod-key'

/** «Disattiva/Riattiva» and the one primary, «Nuova chiave». */
export function PodHeaderActions({ deviceId, active }: { deviceId: string; active: boolean }) {
  const router = useRouter()
  const [toggling, startToggle] = useTransition()
  const [creating, startCreate] = useTransition()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [apiKey, setApiKey] = useState<string | null>(null)

  const toggleActive = () =>
    startToggle(async () => {
      const result = await setDeviceActive(deviceId, !active)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      router.refresh()
      if (active) {
        toastConAnnulla({
          messaggio: 'POD disattivato',
          annulla: async () => {
            const undo = await setDeviceActive(deviceId, true)
            router.refresh()
            return undo.ok ? undefined : { ok: false, motivo: undo.message }
          },
        })
      } else toast.success('POD riattivato')
    })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startCreate(async () => {
      const result = await createKey(deviceId, label)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setOpen(false)
      setLabel('')
      setApiKey(result.data.apiKey)
      router.refresh()
    })
  }

  return (
    <>
      <Button variant='outline' onClick={toggleActive} disabled={toggling}>
        {toggling ? <Spinner /> : active ? <PauseIcon /> : <PlayIcon />}
        {active ? 'Disattiva' : 'Riattiva'}
      </Button>
      <Button onClick={() => setOpen(true)}>
        <KeyRoundIcon /> Nuova chiave
      </Button>
      <DialogoAzione
        open={open}
        onOpenChange={next => {
          setOpen(next)
          if (!next) setLabel('')
        }}
        titolo='Nuova chiave API'
        natura='gesto'
        azione={{ etichetta: 'Crea chiave', type: 'submit', form: FORM_ID, attesa: creating }}
      >
        <form id={FORM_ID} onSubmit={onSubmit}>
          <FormGrid cols={1}>
            <PropertyField label='Nota'>
              <Input
                value={label}
                onChange={event => setLabel(event.target.value)}
                placeholder='Team hardware - prototipo'
                maxLength={120}
                autoFocus
              />
              <p className='text-muted-foreground text-xs'>
                La chiave si vede una sola volta, dopo la creazione.
              </p>
            </PropertyField>
          </FormGrid>
        </form>
      </DialogoAzione>
      <KeyRevealDialog apiKey={apiKey} onClose={() => setApiKey(null)} />
    </>
  )
}
