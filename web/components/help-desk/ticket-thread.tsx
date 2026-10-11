'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Bubble } from '@/components/ds/bolla-messaggio'
import { BottoneIcona } from '@/components/ds/bottone-icona'
import { ConfirmDialog } from '@/components/ds/confirm-dialog'
import { Data } from '@/components/ds/data'
import { EmptyState } from '@/components/ds/empty-state'
import { SectionCard } from '@/components/ds/section-card'
import { initialsOf } from '@/components/people/person-ref'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { deleteTicketMessage } from '@/lib/help-desk/actions'
import { requesterLabel, type TicketDetail, type TicketMessage } from '@/lib/help-desk/types'

/** The conversation: the request first, then replies and internal notes in order. */
export function TicketThread({
  ticket,
  currentProfileId,
  canWrite,
}: {
  ticket: TicketDetail
  currentProfileId: string
  canWrite: boolean
}) {
  const router = useRouter()
  const [toDelete, setToDelete] = useState<string | null>(null)

  const remove = async (id: string) => {
    const result = await deleteTicketMessage(id, ticket.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setToDelete(null)
    toast.success('Messaggio eliminato')
    router.refresh()
  }

  const requester = requesterLabel(ticket)
  const description = ticket.description?.trim() ?? ''
  const empty = description === '' && ticket.messages.length === 0

  return (
    <SectionCard title='Conversazione'>
      {empty ? (
        <EmptyState compatto testo='Nessun messaggio' />
      ) : (
        <div className='space-y-4'>
          {description !== '' && (
            <Bubble
              lato='richiedente'
              avatar={<Initials name={requester} image={ticket.requester?.avatar_url} />}
              firma={requester}
              marcatore={<Age iso={ticket.created_at} />}
            >
              <p className='text-sm whitespace-pre-wrap'>{description}</p>
            </Bubble>
          )}
          {ticket.messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              requesterId={ticket.requester_id}
              canDelete={canWrite && message.author_id === currentProfileId}
              onDelete={() => setToDelete(message.id)}
            />
          ))}
        </div>
      )}
      <ConfirmDialog
        open={toDelete !== null}
        title='Eliminare il messaggio?'
        description='Il messaggio sparisce per tutti. Non si può annullare.'
        confirmLabel='Elimina'
        tone='destructive'
        onConfirm={() => (toDelete ? remove(toDelete) : undefined)}
        onClose={() => setToDelete(null)}
      />
    </SectionCard>
  )
}

function MessageBubble({
  message,
  requesterId,
  canDelete,
  onDelete,
}: {
  message: TicketMessage
  requesterId: string | null
  canDelete: boolean
  onDelete: () => void
}) {
  const note = message.kind === 'note'
  // A reply written by the requester sits on their side; notes are always the team's.
  const fromRequester = !note && message.author_id !== null && message.author_id === requesterId

  return (
    <Bubble
      lato={fromRequester ? 'richiedente' : 'staff'}
      tono={note ? 'nota' : 'messaggio'}
      avatar={<Initials name={message.author?.full_name} image={message.author?.avatar_url} />}
      firma={message.author?.full_name ?? 'Sconosciuto'}
      marcatore={
        <>
          <Age iso={message.created_at} />
          {canDelete && (
            <BottoneIcona
              etichetta='Elimina messaggio'
              icona={<Trash2Icon />}
              variant='ghost'
              size='icon-xs'
              onClick={onDelete}
              className='ms-1 align-middle'
            />
          )}
        </>
      }
    >
      <p className='text-sm whitespace-pre-wrap'>{message.body}</p>
    </Bubble>
  )
}

function Age({ iso }: { iso: string }) {
  return (
    <>
      <span aria-hidden> · </span>
      <Data valore={iso} forma='eta' />
    </>
  )
}

function Initials({ name, image }: { name?: string | null; image?: string | null }) {
  return (
    <Avatar className='size-8'>
      {image && <AvatarImage src={image} alt='' />}
      <AvatarFallback>{name ? initialsOf(name) : '?'}</AvatarFallback>
    </Avatar>
  )
}
