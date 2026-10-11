import { KpiGridSkeleton } from '@/components/ds/kpi-card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-72 max-w-full' />
        <Skeleton className='h-4 w-96 max-w-full' />
      </div>
      <KpiGridSkeleton count={4} />
      <Skeleton className='h-80 w-full' />
    </div>
  )
}
