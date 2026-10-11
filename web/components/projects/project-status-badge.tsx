import { StatusBadge } from '@/components/ds/status-badge'
import { PROJECT_STATUS_LABEL, PROJECT_STATUS_TONE, type ProjectStatus } from '@/lib/projects/types'

export function ProjectStatusBadge({ status, size }: { status: ProjectStatus; size?: 'sm' | 'md' }) {
  return (
    <StatusBadge tone={PROJECT_STATUS_TONE[status]} dot size={size}>
      {PROJECT_STATUS_LABEL[status]}
    </StatusBadge>
  )
}
