'use client'

import { useMemo } from 'react'
import QRCode from 'qrcode'

import { cn } from '@/lib/utils'

const QUIET_ZONE = 4

/**
 * A QR code drawn as SVG from the module matrix. It stays dark-on-light in both themes
 * (the neutral primitives do not change with `.dark`) because phone cameras read that best.
 */
export function QrCode({ text, label, className }: { text: string; label: string; className?: string }) {
  const { path, size } = useMemo(() => {
    const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' })
    let d = ''
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.get(row, col)) d += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`
      }
    }
    return { path: d, size: modules.size + QUIET_ZONE * 2 }
  }, [text])

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      role='img'
      aria-label={label}
      shapeRendering='crispEdges'
      className={cn('block aspect-square w-full rounded-md bg-[var(--n-0)]', className)}
    >
      <path d={path} className='fill-[var(--n-ink)]' />
    </svg>
  )
}
