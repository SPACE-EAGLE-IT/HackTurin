import { DataTableSkeleton } from '@/components/ds/data-table'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-8 w-24' />
      <div className='space-y-2'>
        <Skeleton className='h-7 w-64 max-w-full' />
        <Skeleton className='h-4 w-80 max-w-full' />
      </div>
      <DataTableSkeleton rows={5} />
    </div>
  )
}
