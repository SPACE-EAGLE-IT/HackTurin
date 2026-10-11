import { KpiGridSkeleton } from '@/components/ds/kpi-card'
import { Skeleton } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-40' />
        <Skeleton className='h-4 w-64' />
      </div>
      <KpiGridSkeleton count={4} />
      <div className='grid gap-6 lg:grid-cols-2'>
        <Skeleton className='h-64' />
        <Skeleton className='h-64' />
      </div>
    </>
  )
}
