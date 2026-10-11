'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { MapPinnedIcon } from 'lucide-react'
import { useMemo } from 'react'

import { Data } from '@/components/ds/data'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { StatusBadge } from '@/components/ds/status-badge'
import { CategoryLabel, ReportStatusBadge } from '@/components/segnalazioni/report-badges'
import { useIsMobile } from '@/hooks/use-mobile'
import { categoryName } from '@/lib/civic/categories'
import { REPORT_SOURCE_LABEL, type ReportListItem } from '@/lib/segnalazioni/types'

const href = (r: ReportListItem) => `/segnalazioni/${r.id}`

export function ReportTable({ reports, cornice = true }: { reports: ReportListItem[]; cornice?: boolean }) {
  const isMobile = useIsMobile()
  const columns = useMemo(() => buildColumns(), [])

  if (reports.length === 0) {
    return (
      <EmptyState
        icon={MapPinnedIcon}
        title='Nessuna segnalazione'
        description='Cambia i filtri per vederne altre.'
      />
    )
  }
  if (isMobile) {
    return (
      <MobileRowList>
        {reports.map((r, index) => (
          <MobileRow
            key={r.id}
            index={index}
            href={href(r)}
            title={categoryName(r.category)}
            meta={[
              `CAP ${r.cap}`,
              REPORT_SOURCE_LABEL[r.source],
              <Data key='d' valore={r.created_at} forma='eta' />,
            ]}
            signal={<ReportStatusBadge status={r.status} size='sm' />}
          />
        ))}
      </MobileRowList>
    )
  }
  return (
    <DataTable
      data={reports}
      columns={columns}
      rowHref={href}
      rowLabel={r => categoryName(r.category)}
      footer={({ rese, totali }) => `${rese} di ${totali} segnalazioni`}
      densita='media'
      cornice={cornice}
    />
  )
}

function buildColumns(): ColumnDef<ReportListItem>[] {
  return [
    {
      id: 'category',
      accessorKey: 'category',
      header: 'Categoria',
      cell: ({ row }) => (
        <div className='min-w-0'>
          <CategoryLabel slug={row.original.category} />
          {row.original.description && (
            <p className='text-muted-foreground truncate text-xs'>{row.original.description}</p>
          )}
        </div>
      ),
    },
    { id: 'cap', accessorKey: 'cap', header: 'CAP' },
    {
      id: 'source',
      accessorKey: 'source',
      header: 'Fonte',
      cell: ({ row }) => (
        <span>
          {REPORT_SOURCE_LABEL[row.original.source]}
          {row.original.device_name && (
            <span className='text-muted-foreground'> · {row.original.device_name}</span>
          )}
        </span>
      ),
    },
    {
      id: 'severity',
      accessorKey: 'severity',
      header: 'Gravità',
      cell: ({ row }) => (
        <StatusBadge
          tone={row.original.severity >= 4 ? 'destructive' : row.original.severity >= 3 ? 'warning' : 'muted'}
          variant='piatta'
        >
          {row.original.severity}/5{row.original.observations > 1 ? ` · ×${row.original.observations}` : ''}
        </StatusBadge>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => <ReportStatusBadge status={row.original.status} />,
    },
    {
      id: 'created',
      accessorKey: 'created_at',
      header: 'Ricevuta',
      cell: ({ row }) => <Data valore={row.original.created_at} forma='eta' />,
    },
  ]
}
