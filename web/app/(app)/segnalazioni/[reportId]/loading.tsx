import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-4 w-32' />
      <Skeleton className='h-8 w-72 max-w-full' />
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]'>
        <Skeleton className='h-80' />
        <Skeleton className='h-80' />
      </div>
    </div>
  )
}
