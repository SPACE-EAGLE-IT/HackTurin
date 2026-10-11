import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-8 w-40' />
      <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]'>
        <Skeleton className='h-[60vh]' />
        <Skeleton className='h-64' />
      </div>
    </div>
  )
}
