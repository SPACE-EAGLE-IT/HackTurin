'use client'

import { type ReactNode, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckIcon,
  ExternalLinkIcon,
  HandIcon,
  ListTodoIcon,
  LockIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  Trash2Icon,
} from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ds/confirm-dialog'
import { MenuAzioni } from '@/components/ds/menu-azioni'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import type { ActionResult } from '@/lib/action-result'
import { createTaskFromTicket, deleteTicket, takeTicket, updateTicket } from '@/lib/help-desk/actions'
import type { TicketDetail } from '@/lib/help-desk/types'

type TicketRef = Pick<TicketDetail, 'id' | 'status' | 'assignee_id' | 'task_id'>

type Primary = {
  label: string
  icon: ReactNode
  done: string
  run: () => Promise<ActionResult<unknown>>
}

/** The one primary of the header: the next step of the ticket, given its state and who holds it. */
function primaryOf(ticket: TicketRef, mine: boolean): Primary {
  const { id, status } = ticket
  if (!ticket.assignee_id || (status === 'open' && !mine)) {
    return {
      label: 'Prendi in carico',
      icon: <HandIcon />,
      done: 'Ticket preso in carico',
      run: () => takeTicket(id),
    }
  }
  if (status === 'in_progress' || status === 'waiting') {
    return {
      label: 'Segna risolto',
      icon: <CheckIcon />,
      done: 'Ticket risolto',
      run: () => updateTicket(id, { status: 'resolved' }),
    }
  }
  if (status === 'resolved') {
    return {
      label: 'Chiudi',
      icon: <LockIcon />,
      done: 'Ticket chiuso',
      run: () => updateTicket(id, { status: 'closed' }),
    }
  }
  if (status === 'closed') {
    return {
      label: 'Riapri',
      icon: <RotateCcwIcon />,
      done: 'Ticket riaperto',
      run: () => updateTicket(id, { status: 'open' }),
    }
  }
  return {
    label: 'Inizia',
    icon: <PlayIcon />,
    done: 'Ticket in lavorazione',
    run: () => updateTicket(id, { status: 'in_progress' }),
  }
}

/** The actions of the detail header: the menu with the secondary gestures and the one primary. */
export function TicketActions({ ticket, currentProfileId }: { ticket: TicketRef; currentProfileId: string }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const primary = primaryOf(ticket, ticket.assignee_id === currentProfileId)
  const canWait = ticket.status === 'open' || ticket.status === 'in_progress'

  const run = (action: () => Promise<ActionResult<unknown>>, done: string) =>
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(done)
      router.refresh()
    })

  const remove = async () => {
    const result = await deleteTicket(ticket.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('Ticket eliminato')
    router.push('/help-desk')
  }

  return (
    <>
      <MenuAzioni etichetta='Altre azioni'>
        {canWait && (
          <DropdownMenuItem
            onSelect={() => run(() => updateTicket(ticket.id, { status: 'waiting' }), 'Ticket in attesa')}
          >
            <PauseIcon /> Metti in attesa
          </DropdownMenuItem>
        )}
        {ticket.task_id ? (
          <DropdownMenuItem asChild>
            <Link href={`/tasks/${ticket.task_id}`}>
              <ExternalLinkIcon /> Apri la task
            </Link>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => run(() => createTaskFromTicket(ticket.id), 'Task creata')}>
            <ListTodoIcon /> Crea task dal ticket
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive' onSelect={() => setConfirmOpen(true)}>
          <Trash2Icon /> Elimina ticket
        </DropdownMenuItem>
      </MenuAzioni>
      <Button onClick={() => run(primary.run, primary.done)} disabled={pending}>
        {pending ? <Spinner /> : primary.icon}
        {primary.label}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        title='Eliminare il ticket?'
        description='La conversazione sparisce. Non si può annullare.'
        confirmLabel='Elimina'
        tone='destructive'
        onConfirm={remove}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  )
}
