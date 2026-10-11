'use client'

import { MicIcon, PhoneIcon } from 'lucide-react'
import { useState } from 'react'

import { SectionCard } from '@/components/ds/section-card'
import { Button } from '@/components/ui/button'

// Pinned on purpose: the widget runs with microphone access on our page, so no floating "latest".
const WIDGET_SRC = 'https://unpkg.com/@elevenlabs/convai-widget-embed@0.18.2/dist/index.js'
const WIDGET_TAG = 'elevenlabs-convai'

/** Loads the ElevenLabs widget once and mounts the agent; resolves when the custom element is defined. */
function mountWidget(agentId: string): Promise<void> {
  if (!document.querySelector(`script[src="${WIDGET_SRC}"]`)) {
    const script = document.createElement('script')
    script.src = WIDGET_SRC
    script.async = true
    document.body.appendChild(script)
  }
  if (!document.querySelector(WIDGET_TAG)) {
    const el = document.createElement(WIDGET_TAG)
    el.setAttribute('agent-id', agentId)
    document.body.appendChild(el)
  }
  return Promise.race([
    customElements.whenDefined(WIDGET_TAG).then(() => undefined),
    new Promise<void>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
  ])
}

/** «Preferisci parlare?»: the toll-free voice line and the in-browser voice assistant. */
export function VoiceLine({ agentId, phone }: { agentId: string; phone?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')

  function start() {
    setState('loading')
    mountWidget(agentId).then(
      () => setState('ready'),
      () => setState('error')
    )
  }

  return (
    <SectionCard title='Preferisci parlare?'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-muted-foreground text-sm'>
          {state === 'ready'
            ? 'Assistente pronto: avvia la chiamata dal pulsante in basso a destra e consenti il microfono.'
            : state === 'error'
              ? 'Assistente non disponibile in questo momento: usa il modulo qui sotto.'
              : 'Descrivi il problema a voce: l’assistente chiede il luogo e registra la segnalazione. Nessun dato personale.'}
        </p>
        <div className='flex shrink-0 flex-wrap gap-2'>
          {phone && (
            <Button variant='outline' asChild>
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
                <PhoneIcon /> {phone}
              </a>
            </Button>
          )}
          <Button variant='outline' onClick={start} attesa={state === 'loading'} disabled={state !== 'idle'}>
            <MicIcon /> Parla con l’assistente
          </Button>
        </div>
      </div>
    </SectionCard>
  )
}
