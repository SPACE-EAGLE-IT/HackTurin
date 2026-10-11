import { StatusBadge } from '@/components/ds/status-badge'
import {
  TASK_PRIORITY_LABEL,
  TASK_PRIORITY_TONE,
  TASK_STATUS_LABEL,
  TASK_STATUS_TONE,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/tasks/types'

export function TaskStatusBadge({ status, size }: { status: TaskStatus; size?: 'sm' | 'md' }) {
  return (
    <StatusBadge tone={TASK_STATUS_TONE[status]} dot size={size}>
      {TASK_STATUS_LABEL[status]}
    </StatusBadge>
  )
}

export function TaskPriorityBadge({ priority, size }: { priority: TaskPriority; size?: 'sm' | 'md' }) {
  return (
    <StatusBadge tone={TASK_PRIORITY_TONE[priority]} variant='piatta' size={size}>
      {TASK_PRIORITY_LABEL[priority]}
    </StatusBadge>
  )
}
