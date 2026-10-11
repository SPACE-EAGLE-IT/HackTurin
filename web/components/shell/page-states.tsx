'use client'

import { LockIcon, SearchXIcon } from 'lucide-react'
import Link from 'next/link'

import { EmptyState } from '@/components/ds/empty-state'
import { Button } from '@/components/ui/button'

// These states live in a Client Component because `EmptyState` is one and an icon is a function:
// a Server Component cannot pass it across the boundary.

export function NotFoundState() {
  return (
    <EmptyState
      icon={SearchXIcon}
      title='Pagina non trovata'
      className='w-full max-w-sm'
      action={
        <Button variant='outline' asChild>
          <Link href='/area'>Vai alla tua area</Link>
        </Button>
      }
    />
  )
}

export function NoAccessState({ featureTitle }: { featureTitle?: string }) {
  return (
    <EmptyState
      icon={LockIcon}
      title={featureTitle ? `Non hai accesso a «${featureTitle}»` : 'Non hai accesso a questa sezione'}
      description='Chiedi a un amministratore di abilitarti in Accessi.'
      action={
        <Button variant='outline' asChild>
          <Link href='/area'>Torna alla tua area</Link>
        </Button>
      }
    />
  )
}
