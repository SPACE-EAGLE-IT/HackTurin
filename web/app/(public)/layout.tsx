import type { ReactNode } from 'react'

import { PublicHeader } from '@/components/civic/public-header'
import { TooltipProvider } from '@/components/ui/tooltip'

/** The citizen site: no session needed, the same design system as the staff area. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    // InfoDot tooltips need a provider: the staff shell gets one from its sidebar, the public site from here.
    <TooltipProvider>
      <div className='flex min-h-dvh flex-col'>
        <PublicHeader />
        <main className='flex flex-1 flex-col'>{children}</main>
      </div>
    </TooltipProvider>
  )
}
