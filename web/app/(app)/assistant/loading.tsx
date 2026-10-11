import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <Skeleton className='h-8 w-40' />
        <Skeleton className='h-4 w-72 max-w-full' />
      </div>
      <div className='grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]'>
        <Skeleton className='h-64 w-full' />
        <Skeleton className='h-[60dvh] w-full' />
      </div>
    </div>
  )
}
