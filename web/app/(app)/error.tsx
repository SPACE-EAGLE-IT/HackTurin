'use client'

import { Avviso } from '@/components/ds/avviso'
import { Button } from '@/components/ui/button'

// The shell already pads the content area, so only the inner rhythm is set here.
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className='space-y-4'>
      <Avviso tono='destructive'>Qualcosa è andato storto.</Avviso>
      <Button variant='outline' onClick={reset}>
        Riprova
      </Button>
    </div>
  )
}
