'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

import { EYEBROW_MICRO } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { confirmProposal } from '@/lib/ai/actions'
import type { Proposal } from '@/lib/ai/types'

type CardState = 'idle' | 'done' | 'ignored'

/**
 * A proposal the assistant made: what will happen, «Conferma» runs the module's own action.
 * The state lives in the card only: a reopened conversation shows its proposals as new.
 */
export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [state, setState] = useState<CardState>('idle')
  const [href, setHref] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const confirm = () =>
    startTransition(async () => {
      const result = await confirmProposal({ kind: proposal.kind, input: proposal.input })
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(proposal.title)
      setHref(result.data.href ?? null)
      setState('done')
    })

  return (
    <Card className='gap-2 px-4 py-3'>
      <p className={EYEBROW_MICRO}>{proposal.title}</p>
      <ul className='space-y-0.5 text-sm'>
        {proposal.summary.map((row, index) => (
          <li key={index}>{row}</li>
        ))}
      </ul>
      <div className='flex flex-wrap items-center gap-2 pt-1'>
        {state === 'done' ? (
          <>
            <StatusBadge tone='success'>Fatto</StatusBadge>
            {href && (
              <Button variant='outline' size='sm' asChild>
                <Link href={href}>Apri</Link>
              </Button>
            )}
          </>
        ) : state === 'ignored' ? (
          <StatusBadge tone='muted'>Ignorata</StatusBadge>
        ) : (
          <>
            <Button size='sm' onClick={confirm} disabled={pending}>
              {pending && <Spinner />}
              Conferma
            </Button>
            <Button variant='ghost' size='sm' onClick={() => setState('ignored')} disabled={pending}>
              Ignora
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
