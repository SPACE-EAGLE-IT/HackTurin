'use client'

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport, getToolName, isToolUIPart, type UIMessage } from 'ai'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CopyIcon,
  SparklesIcon,
  SquareIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Avviso } from '@/components/ds/avviso'
import { copiaNegliAppunti } from '@/components/ds/copia-valore'
import { EmptyState } from '@/components/ds/empty-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { setAssistantWorking } from '@/lib/ai/panel-store'
import { isProposalOutput } from '@/lib/ai/registry'
import type { Proposal } from '@/lib/ai/types'
import { cn } from '@/lib/utils'

import { MessageText } from './message-text'
import { Monogram } from './monogram'
import { ProposalCard } from './proposal-card'

export type AssistantChatProps = {
  conversationId: string
  initialMessages: UIMessage[]
  configured: boolean
  isAdmin: boolean
  examples: string[]
  /** `panel` fills the dock; `page` gives the thread a height of its own. */
  variant: 'panel' | 'page'
  /** Called with the first message of an empty thread: the dock titles the conversation with it. */
  onFirstMessage?: (text: string) => void
}

type ToolPart = Parameters<typeof getToolName>[0]

/** An assistant turn, read for the screen: text, the work behind it, proposals and tool errors, in order. */
type Block =
  | { kind: 'text'; text: string }
  | { kind: 'work'; parts: ToolPart[] }
  | { kind: 'proposal'; proposal: Proposal }
  | { kind: 'error'; message: string }

/** How a tool reads in the "work" rows: while it runs, and once it is done (source · verb). */
const TOOLS: Record<string, { running: string; source: string; done: string }> = {
  list_tasks: { running: 'Leggo le task', source: 'Task', done: 'lette' },
  get_task: { running: 'Apro la task', source: 'Task', done: 'aperta' },
  task_kpis: { running: 'Conto le task', source: 'Task', done: 'contate' },
  list_projects: { running: 'Leggo le commesse', source: 'Commesse', done: 'lette' },
  get_project: { running: 'Apro la commessa', source: 'Commesse', done: 'aperta' },
  list_people: { running: 'Leggo le persone', source: 'Persone', done: 'lette' },
  list_tickets: { running: 'Leggo i ticket', source: 'Help desk', done: 'letti' },
  get_ticket: { running: 'Apro il ticket', source: 'Help desk', done: 'aperto' },
  ticket_kpis: { running: 'Conto i ticket', source: 'Help desk', done: 'contati' },
}

const NOT_CONFIGURED = 'Assistente non configurato'
const SEND = 'bg-foreground text-background hover:bg-foreground/90 hover:text-background'

/** The thread and the composer of one conversation; `useChat` talks to `/api/chat`. */
export function AssistantChat({
  conversationId,
  initialMessages,
  configured,
  isAdmin,
  examples,
  variant,
  onFirstMessage,
}: AssistantChatProps) {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: '/api/chat', body: { conversationId } }),
    [conversationId]
  )
  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,
  })
  const busy = status === 'submitted' || status === 'streaming'
  const panel = variant === 'panel'
  const [draft, setDraft] = useState('')
  // True while the person reads the bottom of the thread: only then the stream pulls the scroll along.
  const [atBottom, setAtBottom] = useState(true)
  const threadRef = useRef<HTMLDivElement>(null)

  // The disc and the header button pulse while a turn runs in the panel.
  useEffect(() => {
    if (!panel) return
    setAssistantWorking(busy)
    return () => setAssistantWorking(false)
  }, [busy, panel])

  useEffect(() => {
    const thread = threadRef.current
    if (thread && atBottom) thread.scrollTop = thread.scrollHeight
  }, [messages, status, error, atBottom])

  const onScroll = () => {
    const thread = threadRef.current
    if (thread) setAtBottom(thread.scrollHeight - thread.scrollTop - thread.clientHeight < 48)
  }

  const scrollDown = () => {
    const thread = threadRef.current
    if (thread) thread.scrollTo({ top: thread.scrollHeight, behavior: 'smooth' })
  }

  const send = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy || !configured) return
    if (messages.length === 0) onFirstMessage?.(trimmed)
    setAtBottom(true)
    void sendMessage({ text: trimmed })
    setDraft('')
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    send(draft)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    send(draft)
  }

  const last = messages[messages.length - 1]
  const lastAssistantId = messages.findLast(message => message.role === 'assistant')?.id
  const awaitingReply = status === 'submitted' && last?.role === 'user'

  return (
    <div className={cn('flex min-h-0 flex-col', panel && 'h-full flex-1')}>
      {!configured ? (
        <div className='min-h-0 flex-1 overflow-y-auto p-4'>
          <EmptyState
            icon={SparklesIcon}
            title={NOT_CONFIGURED}
            description='Un amministratore deve collegare un provider.'
            action={
              isAdmin ? (
                <Button variant='outline' asChild>
                  <Link href='/assistant/setup'>Configura</Link>
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : messages.length === 0 && !error ? (
        <Welcome
          examples={examples}
          disabled={busy}
          onAsk={send}
          className={!panel ? 'min-h-[60dvh]' : undefined}
        />
      ) : (
        <div className='relative min-h-0 flex-1'>
          <div
            ref={threadRef}
            onScroll={onScroll}
            className={cn('h-full overflow-y-auto px-4 py-4', !panel && 'max-h-[72dvh] min-h-[60dvh]')}
          >
            {/* A reading measure: in the dock it is never reached, on the full page it keeps lines short. */}
            <div className='mx-auto flex w-full max-w-3xl flex-col gap-3'>
              {messages.map(message =>
                message.role === 'user' ? (
                  <UserTurn key={message.id} message={message} />
                ) : (
                  <AssistantTurn
                    key={message.id}
                    message={message}
                    streaming={busy && message.id === lastAssistantId}
                  />
                )
              )}
              {awaitingReply && <Working />}
              {error && (
                <Avviso
                  tono='destructive'
                  className='flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm'
                >
                  <span>{describeError(error)}</span>
                  <Button variant='outline' size='sm' onClick={() => void regenerate()}>
                    Riprova
                  </Button>
                </Avviso>
              )}
            </div>
          </div>
          {!atBottom && (
            <Button
              type='button'
              variant='outline'
              size='icon-sm'
              aria-label='Torna in fondo'
              onClick={scrollDown}
              className='absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full shadow-md'
            >
              <ArrowDownIcon />
            </Button>
          )}
        </div>
      )}

      {/* One surface: the text above, the commands below. Sending becomes stopping while the turn runs. */}
      <form onSubmit={onSubmit} className='shrink-0 p-3 pt-1'>
        <Card className='assistant-composer gap-0 rounded-xl py-0 shadow-none max-sm:gap-0 max-sm:py-0'>
          <Textarea
            size='title'
            variant='piatta'
            rows={2}
            value={draft}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={configured ? 'Scrivi all’assistente…' : NOT_CONFIGURED}
            disabled={!configured}
            aria-label='Messaggio per l’assistente'
            className='max-h-40 resize-none border-0 shadow-none focus-visible:border-0 focus-visible:ring-0'
          />
          <div className='flex items-center gap-0.5 px-1.5 pb-1.5'>
            <span className='text-muted-foreground min-w-0 flex-1 truncate px-2 text-xs max-sm:hidden'>
              Invio manda, Maiusc+Invio va a capo
            </span>
            <span className='min-w-0 flex-1 sm:hidden' />
            {busy ? (
              <Button
                type='button'
                variant='ghost'
                size='icon-sm'
                aria-label='Ferma la risposta'
                className={SEND}
                onClick={() => void stop()}
              >
                <SquareIcon className='fill-current' />
              </Button>
            ) : (
              <Button
                type='submit'
                variant='ghost'
                size='icon-sm'
                aria-label='Invia'
                disabled={!configured || draft.trim() === ''}
                className={cn(SEND, 'disabled:bg-muted disabled:text-muted-foreground')}
              >
                <ArrowUpIcon />
              </Button>
            )}
          </div>
        </Card>
      </form>
    </div>
  )
}

function greetingNow(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Buonanotte'
  if (hour < 13) return 'Buongiorno'
  if (hour < 18) return 'Buon pomeriggio'
  return 'Buonasera'
}

// The greeting depends on the clock: the server renders none, the browser fills it in after hydration.
const useGreeting = () =>
  useSyncExternalStore(
    () => () => {},
    greetingNow,
    () => null
  )

/** A conversation yet to start: the mark, the greeting and the first questions to try. */
function Welcome({
  examples,
  disabled,
  onAsk,
  className,
}: {
  examples: string[]
  disabled: boolean
  onAsk: (text: string) => void
  className?: string
}) {
  const greeting = useGreeting()
  return (
    <div
      className={cn('flex min-h-0 flex-1 flex-col items-center gap-6 overflow-y-auto px-5 py-8', className)}
    >
      <div className='m-auto flex flex-col items-center gap-4 text-center'>
        <div className='relative'>
          <span aria-hidden className='bg-primary/10 absolute -inset-5 rounded-full blur-2xl' />
          <Image
            src='/brand/iamaimpresa-marchio-nero-256.png'
            alt=''
            width={256}
            height={203}
            className='relative h-11 w-auto object-contain dark:hidden'
          />
          <Image
            src='/brand/iamaimpresa-marchio-bianco-256.png'
            alt=''
            width={256}
            height={203}
            className='relative hidden h-11 w-auto object-contain dark:block'
          />
        </div>
        <div>
          <p className='text-xl font-semibold tracking-tight text-balance'>
            {greeting ? `${greeting}. ` : ''}Come posso aiutarti?
          </p>
          <p className='text-muted-foreground mt-1.5 text-sm text-pretty'>
            Vedo solo ciò che puoi vedere tu: il tetto lo mette il database, non io.
          </p>
        </div>
      </div>
      {examples.length > 0 && (
        <div className='w-full max-w-md space-y-2'>
          <p className='text-muted-foreground text-center text-xs'>Per cominciare</p>
          {examples.slice(0, 3).map(example => (
            <Button
              key={example}
              type='button'
              variant='outline'
              disabled={disabled}
              onClick={() => onAsk(example)}
              className='h-auto w-full justify-start py-2 text-start whitespace-normal'
            >
              {example}
            </Button>
          ))}
        </div>
      )}
      <button
        type='button'
        disabled={disabled}
        onClick={() => onAsk('Cosa sai fare?')}
        className='text-muted-foreground hover:text-foreground relative -mt-2 text-xs underline-offset-4 transition-colors hover:underline'
      >
        Cosa sai fare?
      </button>
    </div>
  )
}

/** What the person wrote: a bubble on the right, no name and no avatar (there is only one person here). */
function UserTurn({ message }: { message: UIMessage }) {
  return (
    <div className='flex flex-col items-end gap-1.5'>
      <div className='bg-muted max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2'>
        <p className='text-sm leading-relaxed break-words whitespace-pre-wrap'>{textOf(message)}</p>
      </div>
    </div>
  )
}

/** What the assistant answered: plain text on the page, the work behind it folded, proposals as cards. */
function AssistantTurn({ message, streaming }: { message: UIMessage; streaming: boolean }) {
  const blocks = blocksOf(message)
  const text = textOf(message)
  return (
    <div className='group/turn flex flex-col gap-2'>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'text':
            return <MessageText key={index} text={block.text} />
          case 'work':
            return (
              <WorkGroup key={index} parts={block.parts} live={streaming && index === blocks.length - 1} />
            )
          case 'proposal':
            return <ProposalCard key={index} proposal={block.proposal} />
          case 'error':
            return (
              <Avviso key={index} tono='destructive' className='px-3 py-2 text-sm'>
                {block.message}
              </Avviso>
            )
        }
      })}
      {streaming && blocks.length === 0 && <Working />}
      {!streaming && text.trim() !== '' && <CopyTurn text={text} />}
    </div>
  )
}

function Working() {
  return (
    <div className='flex items-center gap-2'>
      <Monogram className='size-5' pulsing />
      <span className='assistant-shimmer text-xs'>Sto lavorando…</span>
    </div>
  )
}

/** The tools of a turn: rows while they run, one pill to reopen them once the answer is there. */
function WorkGroup({ parts, live }: { parts: ToolPart[]; live: boolean }) {
  const [open, setOpen] = useState(false)
  if (live) return <WorkRows parts={parts} live />
  const count = parts.length
  return (
    <div className='flex flex-col gap-1.5'>
      <Button
        type='button'
        variant='outline'
        size='xs'
        aria-expanded={open}
        onClick={() => setOpen(value => !value)}
        className='text-muted-foreground w-fit rounded-full font-normal'
      >
        <Monogram className='size-4' />
        {count === 1 ? '1 fonte consultata' : `${count} fonti consultate`}
        {open ? <ChevronDownIcon className='size-3' /> : <ChevronRightIcon className='size-3' />}
      </Button>
      {open && <WorkRows parts={parts} live={false} />}
    </div>
  )
}

function WorkRows({ parts, live }: { parts: ToolPart[]; live: boolean }) {
  return (
    <div className='border-border flex flex-col gap-1.5 border-l-2 py-0.5 pl-3'>
      {parts.map((part, index) => (
        <WorkRow key={index} part={part} live={live && index === parts.length - 1} />
      ))}
    </div>
  )
}

function WorkRow({ part, live }: { part: ToolPart; live: boolean }) {
  const name = getToolName(part)
  const meta = TOOLS[name] ?? { running: 'Lavoro…', source: name.replace(/_/g, ' '), done: 'fatto' }
  const running = part.state === 'input-streaming' || part.state === 'input-available'
  const count = running ? null : countOf(asRecord(part.output))
  return (
    <div
      className={cn('flex items-center gap-2 text-xs', live ? 'text-foreground' : 'text-muted-foreground')}
    >
      <Monogram className='size-4' pulsing={running} />
      {running ? (
        <span className={cn('min-w-0 truncate', live && 'assistant-shimmer')}>{meta.running}</span>
      ) : (
        <span className='min-w-0 truncate'>
          <span className='font-medium'>{meta.source}</span> · {meta.done}
          {count !== null && `: ${count}`}
        </span>
      )}
      {running && <Spinner className='ml-auto size-3 shrink-0' />}
    </div>
  )
}

/** The copy action of an answer: shows on hover, always on touch screens. */
function CopyTurn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () =>
    void copiaNegliAppunti(text).then(ok => {
      if (!ok) {
        toast.error('Non si riesce a copiare da qui')
        return
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  return (
    <div className='-mt-1 flex h-5 items-center'>
      <Button
        type='button'
        variant='ghost'
        size='icon-xs'
        aria-label={copied ? 'Copiato' : 'Copia la risposta'}
        title={copied ? 'Copiato' : 'Copia la risposta'}
        onClick={copy}
        className='text-muted-foreground opacity-0 transition-opacity group-hover/turn:opacity-100 focus-visible:opacity-100 [@media(pointer:coarse)]:opacity-100'
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  )
}

function blocksOf(message: UIMessage): Block[] {
  const blocks: Block[] = []
  for (const part of message.parts) {
    if (part.type === 'text') {
      if (part.text.trim()) blocks.push({ kind: 'text', text: part.text })
      continue
    }
    if (!isToolUIPart(part)) continue
    if (part.state === 'output-error') {
      blocks.push({ kind: 'error', message: part.errorText })
      continue
    }
    if (part.state === 'output-available' && isProposalOutput(part.output)) {
      blocks.push({ kind: 'proposal', proposal: part.output.proposal })
      continue
    }
    const previous = blocks[blocks.length - 1]
    if (previous?.kind === 'work') previous.parts.push(part)
    else blocks.push({ kind: 'work', parts: [part] })
  }
  return blocks
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null
}

function countOf(record: Record<string, unknown> | null): number | null {
  if (!record) return null
  if (typeof record.count === 'number') return record.count
  for (const key of ['tasks', 'projects', 'people', 'tickets']) {
    const value = record[key]
    if (Array.isArray(value)) return value.length
  }
  return null
}

function textOf(message: UIMessage) {
  return message.parts.map(part => (part.type === 'text' ? part.text : '')).join('')
}

/** The route answers errors as `{ error }`; the transport hands that JSON over as the message. */
function describeError(error: Error) {
  let message = error.message
  try {
    const parsed = asRecord(JSON.parse(message))
    if (typeof parsed?.error === 'string') message = parsed.error
  } catch {
    // plain text: shown as it is
  }
  if (message === NOT_CONFIGURED) return `${NOT_CONFIGURED}. Un amministratore deve collegare un provider.`
  return message || 'Il modello non ha risposto'
}
