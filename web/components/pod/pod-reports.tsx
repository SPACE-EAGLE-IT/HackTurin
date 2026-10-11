'use client'

import type { ColumnDef } from '@tanstack/react-table'

import { Data } from '@/components/ds/data'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge, type StatusTone } from '@/components/ds/status-badge'
import { useIsMobile } from '@/hooks/use-mobile'
import { categoryName, REPORT_STATUS, type ReportStatus } from '@/lib/civic/categories'
import { percentoIt } from '@/lib/format-number'
import type { PodReport } from '@/lib/pod/types'

const reportHref = (report: PodReport) => `/segnalazioni/${report.id}`

const STATUS_TONE: Record<ReportStatus, StatusTone> = {
  open: 'info',
  in_progress: 'warning',
  resolved: 'success',
  rejected: 'muted',
}

function ReportStatusBadge({ status }: { status: string }) {
  const known = status in REPORT_STATUS ? (status as ReportStatus) : null
  return (
    <StatusBadge tone={known ? STATUS_TONE[known] : 'muted'}>
      {known ? REPORT_STATUS[known] : status}
    </StatusBadge>
  )
}

const COLUMNS: ColumnDef<PodReport>[] = [
  {
    id: 'category',
    accessorFn: report => categoryName(report.category),
    header: 'Categoria',
    cell: ({ row }) => <span className='font-medium'>{categoryName(row.original.category)}</span>,
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => <ReportStatusBadge status={row.original.status} />,
  },
  {
    id: 'confidence',
    accessorKey: 'confidence',
    header: 'Confidenza',
    cell: ({ row }) => <span className='tabular-nums'>{percentoIt(row.original.confidence * 100)}</span>,
  },
  {
    id: 'created',
    accessorKey: 'created_at',
    header: 'Inviata',
    cell: ({ row }) => <Data valore={row.original.created_at} forma='eta' />,
  },
]

/** The last reports the POD generated. */
export function PodReports({ reports }: { reports: PodReport[] }) {
  const isMobile = useIsMobile()
  return (
    <SectionCard title='Segnalazioni generate'>
      {reports.length === 0 ? (
        <EmptyState compatto testo='Nessuna segnalazione' />
      ) : isMobile ? (
        <MobileRowList>
          {reports.map((report, index) => (
            <MobileRow
              key={report.id}
              index={index}
              href={reportHref(report)}
              title={categoryName(report.category)}
              meta={[<Data key='ts' valore={report.created_at} forma='eta' />]}
              signal={<ReportStatusBadge status={report.status} />}
            />
          ))}
        </MobileRowList>
      ) : (
        <div className='-mx-4 -mb-4'>
          <DataTable
            data={reports}
            columns={COLUMNS}
            rowHref={reportHref}
            rowLabel={report => categoryName(report.category)}
            footer={({ totali }) => `Ultime ${totali} segnalazioni`}
            densita='fitta'
            cornice={false}
          />
        </div>
      )}
    </SectionCard>
  )
}
