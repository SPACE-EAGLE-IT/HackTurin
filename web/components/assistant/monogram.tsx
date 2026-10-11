import Image from 'next/image'

import { cn } from '@/lib/utils'

/** The mark on the sidebar gradient: the face of the assistant in rows, buttons and while it works. */
export function Monogram({ className, pulsing = false }: { className?: string; pulsing?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg bg-[image:var(--gradient-sidebar)]',
        pulsing && 'animate-pulse motion-reduce:animate-none',
        className
      )}
    >
      <Image
        src='/brand/iamaimpresa-marchio-bianco-256.png'
        alt=''
        width={256}
        height={203}
        className='size-[58%] object-contain'
      />
    </span>
  )
}

/** The pulse in the corner of a trigger while a turn is running. */
export function WorkingDot() {
  return (
    <span
      className='bg-primary ring-background absolute -top-0.5 -right-0.5 size-2.5 animate-pulse rounded-full ring-2 motion-reduce:animate-none'
      aria-label='Un turno è in corso'
    />
  )
}
