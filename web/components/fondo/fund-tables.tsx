'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { HeartHandshakeIcon, MapPinnedIcon } from 'lucide-react'

import { Data } from '@/components/ds/data'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { StatusBadge } from '@/components/ds/status-badge'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  type Donation,
  euro,
  type Sponsorship,
  SPONSORSHIP_STATUS_LABEL,
  SPONSORSHIP_STATUS_TONE,
} from '@/lib/fondo/types'
import { planShort } from '@/lib/payments/plans'

const DONATION_COLUMNS: ColumnDef<Donation>[] = [
  {
    id: 'date',
    accessorKey: 'created_at',
    header: 'Data',
    cell: ({ row }) => <Data valore={row.original.created_at} forma='corta' />,
  },
  {
    id: 'donor',
    accessorFn: row => row.donor_name ?? '',
    header: 'Donatore',
    cell: ({ row }) => row.original.donor_name ?? <span className='text-muted-foreground'>Anonimo</span>,
  },
  {
    id: 'email',
    accessorFn: row => row.donor_email ?? '',
    header: 'Email',
    cell: ({ row }) => row.original.donor_email ?? <span className='text-muted-foreground'>—</span>,
  },
  {
    id: 'type',
    accessorKey: 'is_company',
    header: 'Tipo',
    cell: ({ row }) => (row.original.is_company ? 'Azienda' : 'Cittadino'),
  },
  {
    id: 'amount',
    accessorKey: 'amount',
    header: 'Importo',
    cell: ({ row }) => <span className='tabular-nums'>{euro(row.original.amount)}</span>,
  },
]

export function DonationTable({ donations }: { donations: Donation[] }) {
  const isMobile = useIsMobile()
  if (donations.length === 0) return <EmptyState icon={HeartHandshakeIcon} title='Nessuna donazione' />
  if (isMobile) {
    return (
      <MobileRowList>
        {donations.map((row, index) => (
          <MobileRow
            key={row.id}
            index={index}
            title={`${row.donor_name ?? 'Anonimo'} · ${euro(row.amount)}`}
            meta={[
              <Data key='d' valore={row.created_at} forma='corta' />,
              row.is_company ? 'Azienda' : 'Cittadino',
            ]}
          />
        ))}
      </MobileRowList>
    )
  }
  return (
    <DataTable
      data={donations}
      columns={DONATION_COLUMNS}
      densita='media'
      cornice={false}
      footer={({ rese, totali }) => `${rese} di ${totali} donazioni`}
    />
  )
}

export function SponsorshipStatusBadge({ status }: { status: Sponsorship['status'] }) {
  return (
    <StatusBadge tone={SPONSORSHIP_STATUS_TONE[status]} dot>
      {SPONSORSHIP_STATUS_LABEL[status]}
    </StatusBadge>
  )
}

function Period({ row }: { row: Sponsorship }) {
  if (!row.starts_on) return <span className='text-muted-foreground'>—</span>
  return (
    <span>
      <Data valore={row.starts_on} forma='corta' /> –{' '}
      {row.ends_on ? <Data valore={row.ends_on} forma='corta' /> : '…'}
    </span>
  )
}

const SPONSORSHIP_COLUMNS: ColumnDef<Sponsorship>[] = [
  {
    id: 'company',
    accessorKey: 'company_name',
    header: 'Azienda',
    cell: ({ row }) => <span className='font-medium'>{row.original.company_name}</span>,
  },
  { id: 'caps', accessorFn: row => row.caps.join(', '), header: 'CAP' },
  {
    id: 'plan',
    accessorKey: 'plan',
    header: 'Piano',
    cell: ({ row }) => planShort(row.original.plan),
  },
  {
    id: 'amount',
    accessorFn: row => row.amount ?? 0,
    header: 'Importo',
    cell: ({ row }) => (row.original.amount !== null ? euro(row.original.amount) : '—'),
  },
  {
    id: 'period',
    accessorKey: 'starts_on',
    header: 'Periodo',
    cell: ({ row }) => <Period row={row.original} />,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => <SponsorshipStatusBadge status={row.original.status} />,
  },
]

/** Zone adoptions; rows open the impact report. */
export function SponsorshipTable({ sponsorships }: { sponsorships: Sponsorship[] }) {
  const isMobile = useIsMobile()
  const href = (row: Sponsorship) => `/impatto/${row.id}`
  if (sponsorships.length === 0) return <EmptyState icon={MapPinnedIcon} title='Nessuna adozione' />
  if (isMobile) {
    return (
      <MobileRowList>
        {sponsorships.map((row, index) => (
          <MobileRow
            key={row.id}
            index={index}
            href={href(row)}
            title={row.company_name}
            meta={[`CAP ${row.caps.join(', ')}`, <Period key='p' row={row} />]}
            signal={<SponsorshipStatusBadge status={row.status} />}
          />
        ))}
      </MobileRowList>
    )
  }
  return (
    <DataTable
      data={sponsorships}
      columns={SPONSORSHIP_COLUMNS}
      rowHref={href}
      rowLabel={row => row.company_name}
      densita='media'
      cornice={false}
      footer={({ rese, totali }) => `${rese} di ${totali} adozioni`}
    />
  )
}
