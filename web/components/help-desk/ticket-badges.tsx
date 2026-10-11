import { StatusBadge } from '@/components/ds/status-badge'
import {
  TICKET_PRIORITY_LABEL,
  TICKET_PRIORITY_TONE,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/help-desk/types'

export function TicketStatusBadge({ status, size }: { status: TicketStatus; size?: 'sm' | 'md' }) {
  return (
    <StatusBadge tone={TICKET_STATUS_TONE[status]} dot size={size}>
      {TICKET_STATUS_LABEL[status]}
    </StatusBadge>
  )
}

export function TicketPriorityBadge({ priority, size }: { priority: TicketPriority; size?: 'sm' | 'md' }) {
  return (
    <StatusBadge tone={TICKET_PRIORITY_TONE[priority]} variant='piatta' size={size}>
      {TICKET_PRIORITY_LABEL[priority]}
    </StatusBadge>
  )
}
