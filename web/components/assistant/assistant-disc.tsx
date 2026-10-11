'use client'

import Image from 'next/image'
import { usePathname } from 'next/navigation'

import { openAssistant, useAssistantPanel } from '@/lib/ai/panel-store'

import { WorkingDot } from './monogram'

/** The disc in the bottom-right corner that opens the assistant: on desktop, the panel's only trigger. */
export function AssistantDisc() {
  const { open, working } = useAssistantPanel()
  const pathname = usePathname()
  if (open || pathname.startsWith('/assistant')) return null
  return (
    <button
      type='button'
      aria-label="Apri l'assistente"
      title='Assistente'
      onClick={openAssistant}
      className='ring-border fixed right-6 bottom-6 z-(--z-sticky) flex size-12 items-center justify-center rounded-full bg-[image:var(--gradient-sidebar)] shadow-lg ring-1 transition-transform hover:scale-105 active:scale-95 max-sm:hidden print:hidden'
    >
      <Image
        src='/brand/iamaimpresa-marchio-bianco-256.png'
        alt=''
        width={256}
        height={203}
        className='size-6 object-contain'
      />
      {working && <WorkingDot />}
    </button>
  )
}
