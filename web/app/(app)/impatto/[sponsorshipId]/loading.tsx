import { KpiGridSkeleton } from '@/components/ds/kpi-card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-8 w-28' />
      <div className='space-y-2'>
        <Skeleton className='h-8 w-96 max-w-full' />
        <Skeleton className='h-4 w-64 max-w-full' />
      </div>
      <KpiGridSkeleton count={4} />
      <div className='grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-2'>
        <Skeleton className='h-56' />
        <Skeleton className='h-56' />
      </div>
      <Skeleton className='h-40' />
    </div>
  )
}
