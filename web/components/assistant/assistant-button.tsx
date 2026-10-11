'use client'

import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { toggleAssistant, useAssistantPanel } from '@/lib/ai/panel-store'

import { Monogram, WorkingDot } from './monogram'

/** The assistant in the header on phones, where the disc has no room: it opens and closes the panel. */
export function AssistantButton() {
  const { open, working } = useAssistantPanel()
  const pathname = usePathname()
  if (pathname.startsWith('/assistant')) return null
  return (
    <Button
      variant='outline'
      size='sm'
      aria-label='Assistente'
      aria-expanded={open}
      className='relative w-9 justify-center px-0 sm:hidden'
      onClick={toggleAssistant}
    >
      <Monogram className='size-5' />
      {working && !open && <WorkingDot />}
    </Button>
  )
}
