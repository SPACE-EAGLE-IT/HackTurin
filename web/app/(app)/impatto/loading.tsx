import { DataTableSkeleton } from '@/components/ds/data-table'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-40' />
        <Skeleton className='h-4 w-80 max-w-full' />
      </div>
      <DataTableSkeleton rows={4} />
      <Skeleton className='h-64' />
    </div>
  )
}
