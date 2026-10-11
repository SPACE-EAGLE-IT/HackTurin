'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { UIMessage } from 'ai'
import {
  ArchiveIcon,
  CheckIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  HistoryIcon,
  Maximize2Icon,
  MessageSquarePlusIcon,
  SettingsIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { Avviso } from '@/components/ds/avviso'
import { ConfirmDialog } from '@/components/ds/confirm-dialog'
import { MenuAzioni } from '@/components/ds/menu-azioni'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSidebar } from '@/components/ui/sidebar'
import { Spinner } from '@/components/ui/spinner'
import {
  createConversation,
  deleteConversation,
  listMyConversations,
  loadConversation,
} from '@/lib/ai/actions'
import { closeAssistant, toggleAssistantWidth, useAssistantPanel } from '@/lib/ai/panel-store'
import type { ConversationSummary } from '@/lib/ai/types'
import { cn } from '@/lib/utils'

import { AssistantChat } from './assistant-chat'

/** A thread rendered as it is, without touching the database: static previews and visual tests. */
export type AssistantPreview = { conversationId: string; messages: UIMessage[]; title?: string }

export type AssistantDockProps = {
  configured: boolean
  isAdmin: boolean
  examples: string[]
  preview?: AssistantPreview
}

const HEADER_BUTTON = 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
const STORAGE_KEY = 'assistant:conversation'
const TITLE_LENGTH = 44

function readStoredId(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function storeId(id: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, id)
  } catch {
    // storage unavailable: the id lives in state for this page view
  }
}

/** True once the component runs in the browser; the dock renders through a portal, which has no server side. */
const useIsClient = () =>
  useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

/** The title a conversation takes from its first message. */
export function titleFromText(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  return clean.length > TITLE_LENGTH ? `${clean.slice(0, TITLE_LENGTH).trimEnd()}…` : clean
}

function titleOf(messages: UIMessage[]): string | null {
  const first = messages.find(message => message.role === 'user')
  const text = first?.parts.map(part => (part.type === 'text' ? part.text : '')).join('') ?? ''
  return text.trim() ? titleFromText(text) : null
}

/**
 * The assistant docked on the right: a column next to the content on desktop (the shell makes room for it), the
 * whole screen on phones. It mounts at the first opening and then stays, hidden when closed, so a running turn
 * and the thread survive closing and navigation.
 */
export function AssistantDock({ configured, isAdmin, examples, preview }: AssistantDockProps) {
  const { open, everOpened, wide } = useAssistantPanel()
  const pathname = usePathname()
  const router = useRouter()
  const isClient = useIsClient()
  const visible = open && !pathname.startsWith('/assistant')

  // The rail folds while the panel is open and reopens when it closes, as it was.
  const rail = useSidebar()
  const railRef = useRef(rail)
  useEffect(() => {
    railRef.current = rail
  })
  const railWasOpen = useRef(false)
  useEffect(() => {
    const current = railRef.current
    if (current.isMobile) return
    if (visible) {
      railWasOpen.current = current.open
      if (current.open) current.setOpen(false)
    } else if (railWasOpen.current) {
      railWasOpen.current = false
      current.setOpen(true)
    }
  }, [visible])

  // Escape closes the panel, unless a menu or a dialog took the key first.
  useEffect(() => {
    if (!visible) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) closeAssistant()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible])

  const [conversationId, setConversationId] = useState<string | null>(preview?.conversationId ?? null)
  const [messages, setMessages] = useState<UIMessage[]>(preview?.messages ?? [])
  const [title, setTitle] = useState<string | null>(preview?.title ?? null)
  // Bumped on every load so the chat remounts with the fresh thread even when the id is the same.
  const [version, setVersion] = useState(0)
  // Set when the first load fails (no session, no network): the panel offers a retry instead of a spinner.
  const [loadError, setLoadError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [switching, startSwitching] = useTransition()
  const loadedRef = useRef(preview != null)

  const show = useCallback((id: string, thread: UIMessage[], nextTitle: string | null) => {
    storeId(id)
    setConversationId(id)
    setMessages(thread)
    setTitle(nextTitle)
    setVersion(value => value + 1)
  }, [])

  // The first opening resumes the conversation of this tab or starts a new one; later openings keep the live thread.
  useEffect(() => {
    if (!everOpened || loadedRef.current) return
    loadedRef.current = true
    const load = async () => {
      const stored = readStoredId()
      const loaded = stored ? await loadConversation(stored) : null
      if (stored && loaded?.ok) {
        show(stored, loaded.data.messages, titleOf(loaded.data.messages))
        return
      }
      const created = await createConversation()
      if (!created.ok) {
        loadedRef.current = false
        setLoadError(created.message)
        return
      }
      show(created.data.id, [], null)
    }
    void load()
  }, [everOpened, attempt, show])

  const startNew = () =>
    startSwitching(async () => {
      const result = await createConversation()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      show(result.data.id, [], null)
    })

  const openConversation = (summary: ConversationSummary) => {
    if (summary.id === conversationId) return
    startSwitching(async () => {
      const result = await loadConversation(summary.id)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      show(summary.id, result.data.messages, summary.title)
    })
  }

  const remove = async () => {
    if (!conversationId) return
    const result = await deleteConversation(conversationId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('Conversazione eliminata')
    startNew()
  }

  const onMenuOpenChange = (next: boolean) => {
    setMenuOpen(next)
    if (next) void listMyConversations().then(result => setConversations(result.ok ? result.data : []))
  }

  // The full page keeps the thread; the dock hides itself there and shows again on the way back.
  const goFullScreen = () => router.push(conversationId ? `/assistant?c=${conversationId}` : '/assistant')

  if (!isClient || !everOpened) return null

  const body = loadError ? (
    <div className='space-y-3 p-4'>
      <Avviso tono='destructive' className='px-3 py-2 text-sm'>
        {loadError}
      </Avviso>
      <Button
        variant='outline'
        size='sm'
        onClick={() => {
          setLoadError(null)
          setAttempt(value => value + 1)
        }}
      >
        Riprova
      </Button>
    </div>
  ) : switching || !conversationId ? (
    <div className='flex min-h-0 flex-1 items-center justify-center'>
      <Spinner aria-label='Caricamento' />
    </div>
  ) : (
    <AssistantChat
      key={`${conversationId}:${version}`}
      conversationId={conversationId}
      initialMessages={messages}
      configured={configured}
      isAdmin={isAdmin}
      examples={examples}
      variant='panel'
      onFirstMessage={text => setTitle(titleFromText(text))}
    />
  )

  return createPortal(
    <>
      <div
        role='complementary'
        aria-label='Assistente'
        className={cn(
          'assistant-enter bg-card flex flex-col overflow-hidden print:hidden',
          'max-sm:fixed max-sm:inset-0 max-sm:z-(--z-modal)',
          'sm:fixed sm:inset-y-2 sm:right-2 sm:z-(--z-overlay) sm:rounded-xl sm:border sm:shadow-sm',
          wide ? 'sm:w-[40rem]' : 'sm:w-[26rem]',
          !visible && 'hidden'
        )}
      >
        {/* The header wears the rail's gradient: the panel is part of the house, and says so with the mark. */}
        <div className='assistant-sheen flex shrink-0 items-center gap-0.5 bg-[image:var(--gradient-sidebar)] px-3 py-2.5'>
          <Image
            src='/brand/iamaimpresa-marchio-bianco-256.png'
            alt=''
            width={256}
            height={203}
            className='size-4.5 shrink-0 object-contain'
          />
          <p className='text-sidebar-foreground min-w-0 flex-1 truncate px-1 text-sm font-medium'>
            {title ?? 'Assistente'}
          </p>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label='Nuova conversazione'
            title='Nuova conversazione'
            className={HEADER_BUTTON}
            disabled={switching}
            onClick={startNew}
          >
            <MessageSquarePlusIcon />
          </Button>
          <DropdownMenu open={menuOpen} onOpenChange={onMenuOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label='Storico delle conversazioni'
                title='Storico'
                className={HEADER_BUTTON}
              >
                <HistoryIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-64'>
              {conversations.slice(0, 8).map(conversation => (
                <DropdownMenuItem key={conversation.id} onSelect={() => openConversation(conversation)}>
                  <span className='min-w-0 flex-1 truncate'>{conversation.title}</span>
                  {conversation.id === conversationId && (
                    <CheckIcon className='text-muted-foreground size-3.5 shrink-0' aria-label='Aperta' />
                  )}
                </DropdownMenuItem>
              ))}
              {conversations.length === 0 && (
                <DropdownMenuItem disabled>Nessuna conversazione</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={goFullScreen}>
                <ArchiveIcon className='text-muted-foreground size-4' />
                Tutte le conversazioni, a schermo intero
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <MenuAzioni etichetta='Azioni sulla conversazione' className={HEADER_BUTTON} classeContenuto='w-52'>
            {isAdmin && (
              <>
                <DropdownMenuItem asChild>
                  <Link href='/assistant/setup'>
                    <SettingsIcon className='size-4' />
                    Configurazione
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem
              variant='destructive'
              disabled={!conversationId}
              onSelect={() => setConfirmOpen(true)}
            >
              <Trash2Icon className='size-4' />
              Elimina
            </DropdownMenuItem>
          </MenuAzioni>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label={wide ? 'Restringi il pannello' : 'Allarga il pannello'}
            title={wide ? 'Restringi' : 'Allarga'}
            className={cn(HEADER_BUTTON, 'max-sm:hidden')}
            onClick={toggleAssistantWidth}
          >
            {wide ? <ChevronsRightIcon /> : <ChevronsLeftIcon />}
          </Button>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label='Apri a schermo intero'
            title='Schermo intero'
            className={cn(HEADER_BUTTON, 'max-sm:hidden')}
            onClick={goFullScreen}
          >
            <Maximize2Icon />
          </Button>
          <Button
            variant='ghost'
            size='icon-sm'
            aria-label="Chiudi l'assistente"
            title='Chiudi'
            className={HEADER_BUTTON}
            onClick={closeAssistant}
          >
            <XIcon />
          </Button>
        </div>
        {body}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title='Eliminare la conversazione?'
        description='I messaggi spariscono. Non si può annullare.'
        confirmLabel='Elimina'
        tone='destructive'
        onConfirm={remove}
        onClose={() => setConfirmOpen(false)}
      />
    </>,
    document.body
  )
}
