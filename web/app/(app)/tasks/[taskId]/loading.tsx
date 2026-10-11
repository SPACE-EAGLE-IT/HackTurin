import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-8 w-28' />
      <div className='space-y-2'>
        <Skeleton className='h-8 w-96 max-w-full' />
        <Skeleton className='h-4 w-64 max-w-full' />
      </div>
      <div className='grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]'>
        <Skeleton className='h-64' />
        <Skeleton className='h-80' />
      </div>
    </div>
  )
}
