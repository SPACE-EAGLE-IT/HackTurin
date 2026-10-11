'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquareIcon, StickyNoteIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Avviso } from '@/components/ds/avviso'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { addTicketMessage } from '@/lib/help-desk/actions'
import { TICKET_MESSAGE_KINDS, type TicketMessageKind, type TicketStatus } from '@/lib/help-desk/types'

/** Writes a reply to the requester or an internal note for the team. */
export function TicketComposer({
  ticketId,
  status,
  canWrite,
}: {
  ticketId: string
  status: TicketStatus
  canWrite: boolean
}) {
  const router = useRouter()
  const [kind, setKind] = useState<TicketMessageKind>('reply')
  const [body, setBody] = useState('')
  const [pending, startTransition] = useTransition()

  if (!canWrite) return null
  if (status === 'closed') {
    return (
      <Avviso tono='info' className='px-4 py-3 text-sm'>
        Il ticket è chiuso: riaprilo per rispondere.
      </Avviso>
    )
  }

  const note = kind === 'note'

  const submit = () =>
    startTransition(async () => {
      const result = await addTicketMessage({ ticketId, body, kind })
      if (!result.ok) {
        toast.error(result.fieldErrors?.body ?? result.message)
        return
      }
      setBody('')
      toast.success(note ? 'Nota aggiunta' : 'Risposta inviata')
      router.refresh()
    })

  return (
    <Card className='gap-3 p-4'>
      <ToggleGroup
        type='single'
        variant='segmented'
        size='sm'
        value={kind}
        onValueChange={value => {
          const next = TICKET_MESSAGE_KINDS.find(candidate => candidate === value)
          if (next) setKind(next)
        }}
        aria-label='Tipo di messaggio'
      >
        <ToggleGroupItem value='reply' aria-label='Risposta'>
          <MessageSquareIcon /> Risposta
        </ToggleGroupItem>
        <ToggleGroupItem value='note' aria-label='Nota interna'>
          <StickyNoteIcon /> Nota interna
        </ToggleGroupItem>
      </ToggleGroup>
      <Textarea
        value={body}
        onChange={event => setBody(event.target.value)}
        rows={3}
        maxLength={8000}
        placeholder={note ? 'Scrivi una nota per la squadra' : 'Scrivi al richiedente'}
        aria-label={note ? 'Nota interna' : 'Risposta'}
      />
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <p className='text-muted-foreground text-xs'>
          La risposta è per chi ha chiesto; la nota resta nella squadra.
        </p>
        <Button variant='outline' onClick={submit} disabled={pending || body.trim() === ''}>
          {pending && <Spinner />} {note ? 'Aggiungi nota' : 'Rispondi'}
        </Button>
      </div>
    </Card>
  )
}
