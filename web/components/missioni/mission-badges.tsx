import { StatusBadge } from '@/components/ds/status-badge'
import { MISSION_STATUS_LABEL, MISSION_STATUS_TONE, type MissionStatus } from '@/lib/missioni/types'

export function MissionStatusBadge({ status, size }: { status: MissionStatus; size?: 'sm' | 'md' }) {
  return (
    <StatusBadge tone={MISSION_STATUS_TONE[status]} dot size={size}>
      {MISSION_STATUS_LABEL[status]}
    </StatusBadge>
  )
}
