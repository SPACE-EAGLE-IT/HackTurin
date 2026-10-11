import { StatusBadge } from '@/components/ds/status-badge'
import { CATEGORY } from '@/lib/civic/categories'
import { REPORT_STATUS_LABEL, REPORT_STATUS_TONE, type ReportStatus } from '@/lib/segnalazioni/types'

export function ReportStatusBadge({ status, size }: { status: ReportStatus; size?: 'sm' | 'md' }) {
  return (
    <StatusBadge tone={REPORT_STATUS_TONE[status]} dot size={size}>
      {REPORT_STATUS_LABEL[status]}
    </StatusBadge>
  )
}

/** Category name with its map colour, so list and map read the same. */
export function CategoryLabel({ slug }: { slug: string }) {
  const c = CATEGORY[slug]
  return (
    <span className='inline-flex items-center gap-2'>
      <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${c?.dot ?? 'bg-muted-foreground'}`} />
      {c?.name ?? slug}
    </span>
  )
}
