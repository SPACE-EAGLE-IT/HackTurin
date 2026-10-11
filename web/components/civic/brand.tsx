import { MapPinnedIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export const BRAND = { name: 'To.Be', tagline: 'un nuovo modo di vivere la città' } as const

/** The To.Be mark: a pin in the primary square. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'bg-primary text-primary-foreground grid size-7 shrink-0 place-items-center rounded-md',
        className
      )}
    >
      <MapPinnedIcon className='size-4' />
    </span>
  )
}

/** Mark and name; `tagline` adds the claim under the name. */
export function BrandLockup({ tagline = false, className }: { tagline?: boolean; className?: string }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <BrandMark />
      <span className='flex min-w-0 flex-col leading-tight'>
        <span className='font-semibold tracking-tight'>{BRAND.name}</span>
        {tagline && (
          <span className='text-muted-foreground hidden truncate text-xs font-normal sm:block'>
            {BRAND.tagline}
          </span>
        )}
      </span>
    </span>
  )
}
