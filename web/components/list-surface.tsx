'use client'

import type { ReactNode } from 'react'

import { TITOLO_CARTA } from '@/components/ds/section-card'
import { Card } from '@/components/ui/card'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

/**
 * The single surface of a list: the toolbar and the table share one card on desktop, so filters,
 * count and rows read as one object. On phones the pieces stack. The table inside is rendered
 * without its own frame (`cornice={false}`).
 */
export function ListSurface({
  title,
  toolbar,
  above,
  children,
}: {
  title?: string
  toolbar: ReactNode
  above?: ReactNode
  children: ReactNode
}) {
  const isMobile = useIsMobile()
  const heading = title ? <p className={TITOLO_CARTA}>{title}</p> : null

  if (isMobile) {
    return (
      <>
        {heading}
        {toolbar}
        {above}
        {children}
      </>
    )
  }

  return (
    <Card className='gap-0 overflow-hidden py-0' data-list-surface=''>
      <div className={cn('border-b px-4 py-3', heading && 'space-y-3')}>
        {heading}
        {toolbar}
      </div>
      {above && <div className='border-b px-4 py-3'>{above}</div>}
      {children}
    </Card>
  )
}
