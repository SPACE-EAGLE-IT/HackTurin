'use client'

import { ChevronRightIcon } from 'lucide-react'

import { Data } from '@/components/ds/data'
import { EmptyState } from '@/components/ds/empty-state'
import { InfoDot } from '@/components/ds/info-dot'
import { Interruttore } from '@/components/ds/interruttore'
import { SectionCard } from '@/components/ds/section-card'
import { AutoRefresh } from '@/components/pod/auto-refresh'
import { HttpStatusBadge } from '@/components/pod/pod-badges'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { endpointLabel, type PodLogRow } from '@/lib/pod/types'
import { useUrlState } from '@/lib/url-state'

function Who({ row }: { row: PodLogRow }) {
  if (row.device_name) return <span className='truncate'>{row.device_name}</span>
  return (
    <span className='text-muted-foreground truncate'>
      Chiave sconosciuta · <span className='font-mono'>{row.key_prefix ?? '—'}</span>
    </span>
  )
}

function LogRow({ row, showDevice }: { row: PodLogRow; showDevice: boolean }) {
  return (
    <Collapsible className='group/log'>
      <CollapsibleTrigger className='hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center gap-3 px-4 py-2 text-left text-sm focus-visible:ring-2 focus-visible:outline-none'>
        <ChevronRightIcon
          aria-hidden
          className='text-muted-foreground size-4 shrink-0 transition-transform group-data-[state=open]/log:rotate-90'
        />
        <Data valore={row.ts} forma='ora' className='text-muted-foreground w-16 shrink-0' />
        <HttpStatusBadge status={row.status} />
        <span className='w-24 shrink-0'>{endpointLabel(row.endpoint)}</span>
        {showDevice && (
          <span className='flex min-w-0 flex-1'>
            <Who row={row} />
          </span>
        )}
        {row.ip && (
          <span className='text-muted-foreground ml-auto hidden font-mono text-xs md:inline'>{row.ip}</span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className='px-4 pb-3'>
        <div className='text-muted-foreground mb-1 text-xs'>
          <Data valore={row.ts} forma='intera' />
        </div>
        <pre className='bg-muted max-h-80 overflow-auto rounded-md p-3 font-mono text-xs leading-relaxed'>
          {row.body === null ? 'Nessun corpo' : JSON.stringify(row.body, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}

/** The API traffic log: one expandable row per request, the body shown as JSON. */
export function PodLog({
  rows,
  title = 'Traffico API',
  showDevice = true,
  errorsToggle = false,
  live = false,
}: {
  rows: PodLogRow[]
  title?: string
  /** False on a POD page, where every row is the same POD. */
  showDevice?: boolean
  /** Shows the «Solo errori» switch, stored in `?errori=1`. */
  errorsToggle?: boolean
  /** Refreshes the page every 5 seconds. */
  live?: boolean
}) {
  const { get, set } = useUrlState()
  const errori = get('errori') === '1'

  return (
    <SectionCard
      title={title}
      info={live ? <InfoDot label='Aggiornamento'>Si aggiorna ogni 5 secondi.</InfoDot> : undefined}
      action={
        errorsToggle ? (
          <Interruttore
            etichetta='Solo errori'
            acceso={errori}
            onAcceso={on => set('errori', on ? '1' : null)}
          />
        ) : undefined
      }
    >
      {live && <AutoRefresh />}
      {rows.length === 0 ? (
        <EmptyState compatto testo={errori ? 'Nessun errore' : 'Nessuna richiesta'} />
      ) : (
        <div className='-mx-4 divide-y'>
          {rows.map(row => (
            <LogRow key={row.id} row={row} showDevice={showDevice} />
          ))}
        </div>
      )}
    </SectionCard>
  )
}
