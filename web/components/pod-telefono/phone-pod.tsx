'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { FlaskConicalIcon, PlayIcon, SmartphoneIcon, SquareIcon, UnlinkIcon } from 'lucide-react'

import { Avviso } from '@/components/ds/avviso'
import { ConfirmDialog } from '@/components/ds/confirm-dialog'
import { EmptyState } from '@/components/ds/empty-state'
import { Interruttore } from '@/components/ds/interruttore'
import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import { MeterRow } from '@/components/ds/meter-row'
import PageHeader from '@/components/ds/page-header'
import { RigaDettaglio } from '@/components/ds/pannello-scheda'
import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import {
  PhonePodEngine,
  type LogEntry,
  type PermState,
  type PodSnapshot,
} from '@/components/pod-telefono/engine'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CATEGORY } from '@/lib/civic/categories'
import { numeroIt } from '@/lib/format-number'
import {
  MAX_ACCURACY_M,
  SENSITIVITIES,
  SENSITIVITY_LABEL,
  SENSITIVITY_THRESHOLD,
} from '@/lib/pod-telefono/detect'
import { consumePairingHash, readPairing, subscribePairing, unpair } from '@/lib/pod-telefono/storage'
import { cn } from '@/lib/utils'

const TITLE = 'POD telefono'
const DESCRIPTION = 'Il telefono rileva buche e rumore lungo il percorso e li invia a To.Be.'
const QUICK_CATEGORIES = ['rifiuti_abbandonati', 'cassonetto_pieno', 'illuminazione', 'graffiti'] as const

const PERM_LABEL: Record<PermState, string> = {
  off: 'Spento',
  waiting: 'In attesa',
  on: 'Attivo',
  denied: 'Negato',
  unsupported: 'Non supportato',
}
const PERM_TONE = {
  off: 'muted',
  waiting: 'info',
  on: 'success',
  denied: 'destructive',
  unsupported: 'warning',
} as const

/** The phone page: pairing first, then the live POD. */
export function PhonePod() {
  const apiKey = useSyncExternalStore(subscribePairing, readPairing, () => undefined)

  // The key arrives in the URL fragment (on load, or later if the link is opened in this tab):
  // persist it and remove it from the address bar.
  useEffect(() => {
    consumePairingHash()
    window.addEventListener('hashchange', consumePairingHash)
    return () => window.removeEventListener('hashchange', consumePairingHash)
  }, [])

  if (apiKey === undefined) {
    return (
      <div className='space-y-6'>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <Skeleton className='h-40 w-full' />
      </div>
    )
  }
  if (apiKey === null) {
    return (
      <div className='space-y-6'>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <SectionCard>
          <EmptyState
            icon={SmartphoneIcon}
            title='Telefono non collegato'
            description='Dalla Console POD scegli Nuovo POD → tipo Telefono, poi inquadra il QR con questo telefono.'
          />
        </SectionCard>
      </div>
    )
  }
  return <PairedPod key={apiKey} apiKey={apiKey} />
}

function PairedPod({ apiKey }: { apiKey: string }) {
  const [engine] = useState(() => new PhonePodEngine(apiKey))
  const s = useSyncExternalStore(engine.subscribe, engine.getSnapshot, engine.getSnapshot)
  const [env] = useState(() => ({
    secure: window.isSecureContext,
    motion: typeof window.DeviceMotionEvent !== 'undefined',
  }))
  const [starting, setStarting] = useState(false)
  const [confirmUnpair, setConfirmUnpair] = useState(false)

  useEffect(() => {
    engine.attach()
    return () => engine.detach()
  }, [engine])

  const toggleRunning = () => {
    if (s.running) {
      engine.stop()
      return
    }
    setStarting(true)
    void engine.start().finally(() => setStarting(false))
  }

  const actions = (
    <>
      <Button variant='ghost' onClick={() => setConfirmUnpair(true)}>
        <UnlinkIcon /> Scollega telefono
      </Button>
      <Button onClick={toggleRunning} disabled={starting}>
        {starting ? <Spinner /> : s.running ? <SquareIcon /> : <PlayIcon />}
        {s.running ? 'Ferma rilevamento' : 'Avvia rilevamento'}
      </Button>
    </>
  )

  return (
    <div className='space-y-6'>
      <PageHeader
        title={TITLE}
        description={DESCRIPTION}
        badges={
          <StatusBadge tone={s.running ? 'success' : 'muted'} dot>
            {s.running ? 'In rilevamento' : 'Fermo'}
          </StatusBadge>
        }
        actions={actions}
      />

      {!env.secure && (
        <Avviso tono='warning'>
          GPS e sensori funzionano solo su HTTPS (o su localhost): apri la pagina con un indirizzo https.
        </Avviso>
      )}
      {!env.motion && (
        <Avviso tono='warning'>
          Questo browser non dà accesso all&apos;accelerometro: il rilevamento automatico delle buche non è
          disponibile. Restano le segnalazioni rapide e la simulazione.
        </Avviso>
      )}

      <KpiGrid count={4}>
        <KpiCard title='Buche rilevate' value={s.detected} />
        <KpiCard title='Inviate' value={s.sent} tone={s.sent > 0 ? 'success' : 'default'} />
        <KpiCard title='In coda' value={s.queued} tone={s.queued > 0 ? 'warning' : 'default'} />
        <KpiCard
          title='Velocità'
          display={s.fix?.speedKmh != null ? numeroIt(Math.round(s.fix.speedKmh)) : '—'}
          suffix='km/h'
        />
      </KpiGrid>

      <Detection engine={engine} s={s} />
      <Sensors s={s} />
      <QuickReports engine={engine} />
      <EventLog log={s.log} />

      <SectionCard title='Strumenti di prova'>
        <div className='flex flex-col items-start gap-2'>
          <Button variant='outline' onClick={() => engine.simulate()}>
            <FlaskConicalIcon /> Simula buca
          </Button>
          <p className='text-muted-foreground text-xs'>
            Invia una buca finta nella posizione attuale (Piazza Castello senza GPS), marcata come simulata.
          </p>
        </div>
      </SectionCard>

      <ConfirmDialog
        open={confirmUnpair}
        title='Scollegare il telefono?'
        description='La chiave viene cancellata da questo telefono, insieme alle segnalazioni in coda. Per ricollegarlo serve di nuovo il QR dalla Console POD.'
        confirmLabel='Scollega'
        tone='destructive'
        onConfirm={() => {
          engine.stop()
          unpair()
        }}
        onClose={() => setConfirmUnpair(false)}
      />
    </div>
  )
}

function Detection({ engine, s }: { engine: PhonePodEngine; s: PodSnapshot }) {
  const threshold = SENSITIVITY_THRESHOLD[s.sensitivity]
  return (
    <SectionCard
      title='Rilevamento'
      action={
        <ToggleGroup
          type='single'
          variant='segmented'
          size='sm'
          value={s.sensitivity}
          onValueChange={value => {
            const match = SENSITIVITIES.find(x => x === value)
            if (match) engine.setSensitivity(match)
          }}
          aria-label='Sensibilità'
        >
          {SENSITIVITIES.map(x => (
            <ToggleGroupItem key={x} value={x}>
              {SENSITIVITY_LABEL[x]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      }
    >
      <div className='space-y-4'>
        <MeterRow
          label='Scossone'
          value={`${numeroIt(s.jolt)} / ${numeroIt(threshold)} m/s²`}
          valueClassName='w-28 text-right text-sm font-medium tabular-nums'
          // Full at the threshold: a full, warning-coloured bar is a pothole.
          pct={Math.min(100, (s.jolt / threshold) * 100)}
          fillClassName={s.jolt >= threshold ? 'bg-warning' : 'bg-primary'}
          animate={false}
        />
        <Interruttore
          etichetta='Modalità test'
          descrizione='Rileva anche da fermi o a piedi (normalmente servono almeno 8 km/h).'
          acceso={s.testMode}
          onAcceso={value => engine.setTestMode(value)}
        />
        <Interruttore
          etichetta='Livello di rumore'
          descrizione="L'audio è elaborato sul telefono e non viene mai registrato né inviato: parte solo il livello medio al minuto."
          acceso={s.noiseOn}
          onAcceso={value => void engine.setNoise(value)}
        />
        {s.noiseOn && (
          <RigaDettaglio label='Rumore (stimato)'>
            {s.noiseDb === null
              ? s.running
                ? 'In attesa'
                : 'Parte con il rilevamento'
              : `${numeroIt(s.noiseDb)} dB · media 60 s ${s.noiseAvg === null ? '—' : numeroIt(s.noiseAvg)} dB`}
          </RigaDettaglio>
        )}
      </div>
    </SectionCard>
  )
}

function PermBadge({ state }: { state: PermState }) {
  return (
    <StatusBadge tone={PERM_TONE[state]} dot>
      {PERM_LABEL[state]}
    </StatusBadge>
  )
}

function Sensors({ s }: { s: PodSnapshot }) {
  const accuracy = s.fix ? Math.round(s.fix.accuracy) : null
  return (
    <SectionCard title='Sensori'>
      <div className='space-y-2'>
        <RigaDettaglio label='GPS'>
          <span className='inline-flex items-center gap-2'>
            {accuracy !== null && (
              <span className={cn('tabular-nums', accuracy > MAX_ACCURACY_M && 'text-destructive')}>
                ± {numeroIt(accuracy)} m
              </span>
            )}
            <PermBadge state={s.perms.gps} />
          </span>
        </RigaDettaglio>
        <RigaDettaglio label='Accelerometro'>
          <PermBadge state={s.perms.motion} />
        </RigaDettaglio>
        <RigaDettaglio label='Schermo sempre acceso'>
          <PermBadge state={s.perms.wakeLock} />
        </RigaDettaglio>
        <RigaDettaglio label='Microfono'>
          <PermBadge state={s.perms.mic} />
        </RigaDettaglio>
        <RigaDettaglio label='Ultimo heartbeat'>
          {s.heartbeat ? (
            <span className='inline-flex items-center gap-2'>
              <span className='tabular-nums'>{timeOf(s.heartbeat.ts)}</span>
              <StatusBadge tone={heartbeatTone(s.heartbeat.status)}>
                {s.heartbeat.status ?? 'Rete assente'}
              </StatusBadge>
            </span>
          ) : (
            '—'
          )}
        </RigaDettaglio>
      </div>
    </SectionCard>
  )
}

const heartbeatTone = (status: number | null) =>
  status === null ? 'warning' : status < 300 ? 'success' : 'destructive'

function QuickReports({ engine }: { engine: PhonePodEngine }) {
  const [pending, setPending] = useState<string | null>(null)
  const send = (category: string) => {
    setPending(category)
    void engine.manual(category).finally(() => setPending(null))
  }
  return (
    <SectionCard title='Segnalazione rapida'>
      <div className='grid grid-cols-2 gap-2'>
        {QUICK_CATEGORIES.map(slug => (
          <Button
            key={slug}
            variant='outline'
            className='h-auto justify-start py-3 whitespace-normal'
            disabled={pending !== null}
            onClick={() => send(slug)}
          >
            {pending === slug ? (
              <Spinner />
            ) : (
              <span className={cn('size-2.5 shrink-0 rounded-full', CATEGORY[slug].dot)} aria-hidden />
            )}
            <span className='text-left'>{CATEGORY[slug].name}</span>
          </Button>
        ))}
      </div>
    </SectionCard>
  )
}

const timeOf = (ts: number) =>
  new Date(ts).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

function EventLog({ log }: { log: LogEntry[] }) {
  return (
    <SectionCard title='Ultimi eventi'>
      {log.length === 0 ? (
        <EmptyState compatto testo='Nessun evento' />
      ) : (
        <div className='-mx-4 divide-y'>
          {log.map(entry => (
            <div key={entry.id} className='flex items-center gap-3 px-4 py-2 text-sm'>
              <span className='text-muted-foreground w-16 shrink-0 tabular-nums'>{timeOf(entry.ts)}</span>
              <span className='min-w-0 flex-1'>
                <span className='block truncate font-medium'>{entry.label}</span>
                <span className='text-muted-foreground block truncate text-xs'>{entry.note}</span>
              </span>
              <StatusBadge tone={entry.tone} className='tabular-nums'>
                {entry.status ?? '—'}
              </StatusBadge>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
