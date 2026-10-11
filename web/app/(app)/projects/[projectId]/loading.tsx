import { DataTableSkeleton } from '@/components/ds/data-table'
import { KpiGridSkeleton } from '@/components/ds/kpi-card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <Skeleton className='h-7 w-64' />
        <Skeleton className='h-4 w-48' />
      </div>
      <KpiGridSkeleton count={3} />
      <DataTableSkeleton rows={6} />
    </div>
  )
}
