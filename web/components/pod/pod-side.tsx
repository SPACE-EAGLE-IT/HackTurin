'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BanIcon } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ds/confirm-dialog'
import { CopiaValore } from '@/components/ds/copia-valore'
import { Data } from '@/components/ds/data'
import { EmptyState } from '@/components/ds/empty-state'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { StatusBadge } from '@/components/ds/status-badge'
import { Button } from '@/components/ui/button'
import { numeroIt } from '@/lib/format-number'
import { revokeKey } from '@/lib/pod/actions'
import { deviceTypeLabel, type PodDetail, type PodKey } from '@/lib/pod/types'

/** The facts of a POD: type, last contact, battery, firmware, position. */
export function PodFacts({ device }: { device: PodDetail }) {
  const position = device.position
  const coords = position ? `${position.lat.toFixed(5)}, ${position.lon.toFixed(5)}` : null
  return (
    <PannelloScheda occhiello='Scheda'>
      <RigaDettaglio label='Tipo'>{deviceTypeLabel(device.type)}</RigaDettaglio>
      <RigaDettaglio label={device.type === 'mobile' ? 'Mezzo' : 'Posizione'}>
        {device.label ?? '—'}
      </RigaDettaglio>
      <RigaDettaglio label='Ultimo contatto'>
        {device.last_seen_at ? <Data valore={device.last_seen_at} forma='eta' /> : 'Mai'}
      </RigaDettaglio>
      <RigaDettaglio label='Batteria'>
        {device.battery === null ? (
          '—'
        ) : (
          <span className={device.battery < 20 ? 'text-destructive' : undefined}>
            {numeroIt(device.battery)}%
          </span>
        )}
      </RigaDettaglio>
      <RigaDettaglio label='Firmware'>{device.firmware ?? '—'}</RigaDettaglio>
      <RigaDettaglio label='Coordinate'>
        {coords ? (
          <span className='inline-flex items-center gap-1 font-mono text-xs'>
            {coords}
            <CopiaValore testo={coords} etichetta='coordinate' />
          </span>
        ) : (
          '—'
        )}
      </RigaDettaglio>
      <RigaDettaglio label='Richieste 24h'>
        {numeroIt(device.requests24h)}
        {device.errors24h > 0 && (
          <span className='text-destructive'> · {numeroIt(device.errors24h)} errori</span>
        )}
      </RigaDettaglio>
      <RigaDettaglio label='Creato'>
        <Data valore={device.created_at} forma='corta' />
      </RigaDettaglio>
    </PannelloScheda>
  )
}

function KeyRow({ apiKey, canWrite, onRevoke }: { apiKey: PodKey; canWrite: boolean; onRevoke: () => void }) {
  const revoked = apiKey.revoked_at !== null
  return (
    <div className='space-y-1 py-3 text-sm first:pt-0 last:pb-0'>
      <div className='flex items-center justify-between gap-2'>
        <span className={revoked ? 'text-muted-foreground font-mono line-through' : 'font-mono'}>
          {apiKey.key_prefix}…
        </span>
        {revoked ? (
          <StatusBadge tone='muted'>Revocata</StatusBadge>
        ) : canWrite ? (
          <Button variant='outline' size='sm' onClick={onRevoke}>
            <BanIcon /> Revoca
          </Button>
        ) : (
          <StatusBadge tone='success'>Attiva</StatusBadge>
        )}
      </div>
      {apiKey.label && <p className='text-muted-foreground'>{apiKey.label}</p>}
      <p className='text-muted-foreground text-xs'>
        Creata <Data valore={apiKey.created_at} forma='corta' /> · Ultimo uso{' '}
        {apiKey.last_used_at ? <Data valore={apiKey.last_used_at} forma='eta' /> : 'mai'}
        {revoked && apiKey.revoked_at && (
          <>
            {' '}
            · Revocata <Data valore={apiKey.revoked_at} forma='corta' />
          </>
        )}
      </p>
    </div>
  )
}

/** The POD's API keys; revoking one asks for confirmation. */
export function PodKeys({ keys, canWrite }: { keys: PodKey[]; canWrite: boolean }) {
  const router = useRouter()
  const [target, setTarget] = useState<PodKey | null>(null)

  const revoke = async () => {
    if (!target) return
    const result = await revokeKey(target.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('Chiave revocata')
    setTarget(null)
    router.refresh()
  }

  return (
    <PannelloScheda occhiello='Chiavi API'>
      {keys.length === 0 ? (
        <EmptyState compatto testo='Nessuna chiave' />
      ) : (
        <div className='divide-y'>
          {keys.map(key => (
            <KeyRow key={key.id} apiKey={key} canWrite={canWrite} onRevoke={() => setTarget(key)} />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={target !== null}
        title='Revocare la chiave?'
        description={`Il POD che usa la chiave ${target?.key_prefix ?? ''}… riceverà 401 da subito. Non si può annullare.`}
        confirmLabel='Revoca'
        tone='destructive'
        onConfirm={revoke}
        onClose={() => setTarget(null)}
      />
    </PannelloScheda>
  )
}
