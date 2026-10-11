import Image from 'next/image'

import { cn } from '@/lib/utils'

export const BRAND = { name: 'To.Be', tagline: 'un nuovo modo di vivere Torino' } as const

/** The To.Be mark (the Mole in the circle with the red dot) on its white tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Image
      src='/brand/tobe-icon-192.png'
      alt={BRAND.name}
      width={192}
      height={192}
      className={cn('size-7 shrink-0 rounded-md', className)}
      priority
    />
  )
}

/**
 * The logo: navy on light surfaces, white on dark ones. `tagline` uses the full logo with
 * «un nuovo modo di vivere Torino»; `onDark` forces the white version (e.g. the staff rail).
 */
export function BrandLockup({
  tagline = false,
  onDark = false,
  className,
}: {
  tagline?: boolean
  onDark?: boolean
  className?: string
}) {
  const file = tagline ? 'tobe-logo' : 'tobe-wordmark'
  const [w, h] = tagline ? [1233, 429] : [1182, 363]
  const size = cn('w-auto', tagline ? 'h-10' : 'h-6', className)
  if (onDark) {
    return (
      <Image
        src={`/brand/${file}-light.png`}
        alt={BRAND.name}
        width={w}
        height={h}
        className={size}
        priority
      />
    )
  }
  return (
    <>
      <Image
        src={`/brand/${file}.png`}
        alt={BRAND.name}
        width={w}
        height={h}
        className={cn(size, 'dark:hidden')}
        priority
      />
      <Image
        src={`/brand/${file}-light.png`}
        alt={BRAND.name}
        width={w}
        height={h}
        className={cn(size, 'hidden dark:block')}
        priority
      />
    </>
  )
}
