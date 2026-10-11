'use client'

import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from 'ai'
import { CheckCircle2Icon, MessageCircleIcon, SendIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'

import { MessageText } from '@/components/assistant/message-text'
import { Avviso } from '@/components/ds/avviso'
import { EmptyState } from '@/components/ds/empty-state'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { ReportDraft } from '@/lib/cittadino/assistant'
import { cn } from '@/lib/utils'

const EXAMPLES = [
  'C’è una buca in via Nizza 150',
  'Cosa è già segnalato vicino a piazza Vittorio?',
  'Com’è l’aria oggi a Torino?',
  'Come posso fare volontariato?',
]

/** Header button + side panel: the citizen chat with To.Be, on Claude. Hidden when no key is configured. */
export function CitizenAssistant() {
  const [available, setAvailable] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const ctl = new AbortController()
    fetch('/api/public/assistant', { signal: ctl.signal })
      .then(r => r.json())
      .then((j: { available?: boolean }) => setAvailable(Boolean(j.available)))
      .catch(() => {})
    return () => ctl.abort()
  }, [])

  if (!available) return null
  return (
    <>
      <Button variant='ghost' size='sm' onClick={() => setOpen(true)} aria-label='Chiedi a To.Be'>
        <MessageCircleIcon />
        <span className='max-sm:hidden'>Chiedi</span>
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className='flex w-full flex-col gap-0 p-0 sm:max-w-md'>
          <SheetHeader className='border-b'>
            <SheetTitle>Chiedi a To.Be</SheetTitle>
            <SheetDescription>Segnala parlando, scopri cosa succede nella tua via.</SheetDescription>
          </SheetHeader>
          <Chat />
        </SheetContent>
      </Sheet>
    </>
  )
}

function Chat() {
  const transport = useMemo(() => new DefaultChatTransport({ api: '/api/public/assistant' }), [])
  const { messages, sendMessage, status, error } = useChat({ transport })
  const [draft, setDraft] = useState('')
  const threadRef = useRef<HTMLDivElement>(null)
  const busy = status === 'submitted' || status === 'streaming'

  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, status])

  const send = (text: string) => {
    const t = text.trim()
    if (!t || busy) return
    void sendMessage({ text: t })
    setDraft('')
  }
  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    send(draft)
  }

  return (
    <>
      <div ref={threadRef} className='min-h-0 flex-1 space-y-3 overflow-y-auto p-4'>
        {messages.length === 0 ? (
          <div className='space-y-3'>
            <p className='text-muted-foreground text-sm'>Prova a chiedere:</p>
            <div className='flex flex-col items-start gap-2'>
              {EXAMPLES.map(q => (
                <Button
                  key={q}
                  variant='outline'
                  size='sm'
                  className='h-auto py-1.5 text-left whitespace-normal'
                  onClick={() => send(q)}
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(m => <Turn key={m.id} message={m} />)
        )}
        {status === 'submitted' && (
          <p className='text-muted-foreground flex items-center gap-2 text-sm'>
            <Spinner /> Sto cercando…
          </p>
        )}
        {error && <Avviso tono='destructive'>L’assistente non risponde: riprova tra poco.</Avviso>}
      </div>
      <form onSubmit={onSubmit} className='flex items-end gap-2 border-t p-3'>
        <Textarea
          rows={2}
          value={draft}
          maxLength={800}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              send(draft)
            }
          }}
          placeholder='Scrivi qui…'
          aria-label='Messaggio'
          className='max-h-32 resize-none'
        />
        <Button type='submit' size='icon' disabled={busy || !draft.trim()} aria-label='Invia messaggio'>
          <SendIcon />
        </Button>
      </form>
      <p className='text-muted-foreground px-3 pb-3 text-xs'>
        Risponde un’intelligenza artificiale: può sbagliare. Non scrivere dati personali. Emergenze: 112.
      </p>
    </>
  )
}

function Turn({ message }: { message: UIMessage }) {
  const mine = message.role === 'user'
  return (
    <div className={cn('flex flex-col gap-2', mine && 'items-end')}>
      {message.parts.map((part, i) => {
        if (part.type === 'text' && part.text.trim()) {
          return mine ? (
            <p
              key={i}
              className='bg-primary text-primary-foreground max-w-[85%] rounded-lg px-3 py-2 text-sm'
            >
              {part.text}
            </p>
          ) : (
            <div key={i} className='max-w-[95%]'>
              <MessageText text={part.text} />
            </div>
          )
        }
        if (
          isToolUIPart(part) &&
          getToolName(part) === 'prepara_segnalazione' &&
          part.state === 'output-available'
        ) {
          const out = part.output as ReportDraft | { pronta: false }
          return out.pronta ? <DraftCard key={i} draft={out} /> : null
        }
        return null
      })}
    </div>
  )
}

/** The AI only prepares the report: the citizen sends it with their own tap. */
function DraftCard({ draft }: { draft: ReportDraft }) {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [deduped, setDeduped] = useState(false)

  const submit = async () => {
    setState('sending')
    const r = await fetch('/api/public/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category: draft.categoria,
        lat: draft.lat,
        lon: draft.lon,
        description: `[Assistente] ${draft.descrizione}`.slice(0, 500),
      }),
    }).catch(() => null)
    const j = (await r?.json().catch(() => ({}))) as { deduped?: boolean } | undefined
    if (!r?.ok) return setState('error')
    setDeduped(Boolean(j?.deduped))
    setState('sent')
  }

  if (state === 'sent') {
    return (
      <EmptyState
        icon={CheckCircle2Icon}
        title='Segnalazione inviata'
        description={
          deduped
            ? 'Era già stata segnalata: la tua conferma la rende più urgente.'
            : 'È sulla mappa e arriva agli operatori del Comune.'
        }
        action={
          <Button asChild variant='outline' size='sm'>
            <Link href='/'>Vedi la mappa</Link>
          </Button>
        }
      />
    )
  }
  return (
    <div className='w-full space-y-2'>
      <PannelloScheda occhiello='Segnalazione pronta'>
        <RigaDettaglio label='Cosa'>{draft.categoria_nome}</RigaDettaglio>
        <RigaDettaglio label='Dove'>
          {/\b10\d{3}\b/.test(draft.indirizzo) ? draft.indirizzo : `${draft.indirizzo} · CAP ${draft.cap}`}
        </RigaDettaglio>
        {draft.descrizione && <RigaDettaglio label='Dettagli'>{draft.descrizione}</RigaDettaglio>}
      </PannelloScheda>
      {state === 'error' && <Avviso tono='destructive'>Non inviata: riprova tra un minuto.</Avviso>}
      <div className='flex justify-end'>
        <Button size='sm' onClick={submit} disabled={state === 'sending'}>
          {state === 'sending' && <Spinner />} Invia segnalazione
        </Button>
      </div>
    </div>
  )
}
