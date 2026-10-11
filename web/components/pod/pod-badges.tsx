'use client'

import { StatusBadge } from '@/components/ds/status-badge'
import { httpStatusTone, POD_STATE_LABEL, POD_STATE_TONE, podState } from '@/lib/pod/types'

export function PodStateBadge({ device }: { device: { active: boolean; online: boolean } }) {
  const state = podState(device)
  return (
    <StatusBadge tone={POD_STATE_TONE[state]} dot>
      {POD_STATE_LABEL[state]}
    </StatusBadge>
  )
}

export function HttpStatusBadge({ status }: { status: number }) {
  return (
    <StatusBadge tone={httpStatusTone(status)} className='tabular-nums'>
      {status}
    </StatusBadge>
  )
}
