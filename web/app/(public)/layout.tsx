import type { ReactNode } from 'react'

import { PublicHeader } from '@/components/civic/public-header'

/** The citizen site: no session needed, the same design system as the staff area. */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className='flex min-h-dvh flex-col'>
      <PublicHeader />
      <main className='flex flex-1 flex-col'>{children}</main>
    </div>
  )
}
