import { DataTableSkeleton } from '@/components/ds/data-table'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <Skeleton className='h-7 w-40' />
        <Skeleton className='h-4 w-72' />
      </div>
      <DataTableSkeleton rows={6} />
    </div>
  )
}
