'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { LifeBuoyIcon } from 'lucide-react'

import { Data } from '@/components/ds/data'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/help-desk/ticket-badges'
import { Person } from '@/components/people/person-ref'
import { useIsMobile } from '@/hooks/use-mobile'
import { isTicketOverdue, requesterLabel, type TicketListItem } from '@/lib/help-desk/types'

const ticketHref = (ticket: TicketListItem) => `/help-desk/${ticket.id}`

export function TicketTable({
  tickets,
  emptyTitle,
  cornice = true,
}: {
  tickets: TicketListItem[]
  emptyTitle?: string
  /** False inside a `ListSurface`, which already draws the card. */
  cornice?: boolean
}) {
  const isMobile = useIsMobile()
  // Taken once per mount, so the overdue mark does not flicker between renders.
  const [now] = useState(() => new Date().toISOString())
  const columns = useMemo(() => buildColumns(now), [now])

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={LifeBuoyIcon}
        title={emptyTitle ?? 'Nessun ticket'}
        description='Apri il primo ticket o cambia i filtri.'
      />
    )
  }

  if (isMobile) {
    return (
      <MobileRowList>
        {tickets.map((ticket, index) => (
          <MobileRow
            key={ticket.id}
            index={index}
            href={ticketHref(ticket)}
            title={`${ticket.code} · ${ticket.title}`}
            meta={[requesterLabel(ticket), <Data key='created' valore={ticket.created_at} forma='eta' />]}
            leading={ticket.assignee ? <Person person={ticket.assignee} size='xs' /> : undefined}
            signal={<TicketStatusBadge status={ticket.status} size='sm' />}
          />
        ))}
      </MobileRowList>
    )
  }

  return (
    <DataTable
      data={tickets}
      columns={columns}
      rowHref={ticketHref}
      rowLabel={ticket => `${ticket.code} · ${ticket.title}`}
      footer={({ rese, totali }) => `${rese} di ${totali} ticket`}
      densita='media'
      cornice={cornice}
    />
  )
}

function DueDate({ ticket, now }: { ticket: TicketListItem; now: string }) {
  if (!ticket.due_at) return <span className='text-muted-foreground'>—</span>
  return (
    <Data
      valore={ticket.due_at}
      forma='corta'
      className={isTicketOverdue(ticket, now) ? 'text-destructive' : undefined}
    />
  )
}

function buildColumns(now: string): ColumnDef<TicketListItem>[] {
  return [
    {
      id: 'code',
      accessorKey: 'code',
      header: 'Codice',
      cell: ({ row }) => <span className='text-muted-foreground tabular-nums'>{row.original.code}</span>,
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Titolo',
      cell: ({ row }) => (
        <div className='min-w-0'>
          <div className='font-medium'>{row.original.title}</div>
          {row.original.category && (
            <div className='text-muted-foreground text-xs'>{row.original.category.name}</div>
          )}
        </div>
      ),
    },
    {
      id: 'requester',
      accessorFn: ticket => requesterLabel(ticket),
      header: 'Richiedente',
      cell: ({ row }) =>
        row.original.requester ? (
          <Person person={row.original.requester} size='xs' />
        ) : (
          <span>{requesterLabel(row.original)}</span>
        ),
    },
    {
      id: 'assignee',
      accessorFn: ticket => ticket.assignee?.full_name ?? '',
      header: 'Assegnato a',
      cell: ({ row }) => <Person person={row.original.assignee} size='xs' emptyLabel='Non assegnato' />,
    },
    {
      id: 'priority',
      accessorKey: 'priority',
      header: 'Priorità',
      cell: ({ row }) => <TicketPriorityBadge priority={row.original.priority} />,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => <TicketStatusBadge status={row.original.status} />,
    },
    {
      id: 'created',
      accessorKey: 'created_at',
      header: 'Aperto',
      cell: ({ row }) => <Data valore={row.original.created_at} forma='eta' />,
    },
    {
      id: 'due',
      accessorKey: 'due_at',
      header: 'Scadenza',
      cell: ({ row }) => <DueDate ticket={row.original} now={now} />,
    },
  ]
}
