import type { StatusTone } from '@/components/ds/status-badge'
import type { Enums, Tables } from '@/lib/supabase/database.types'

export type TaskStatus = Enums<'task_status'>
export type TaskPriority = Enums<'task_priority'>
export type TaskRow = Tables<'tasks'>

export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'review',
  'done',
] as const satisfies readonly TaskStatus[]
export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const satisfies readonly TaskPriority[]

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Da fare',
  in_progress: 'In corso',
  review: 'In revisione',
  done: 'Fatta',
}

export const TASK_STATUS_TONE: Record<TaskStatus, StatusTone> = {
  todo: 'muted',
  in_progress: 'info',
  review: 'warning',
  done: 'success',
}

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Bassa',
}

export const TASK_PRIORITY_TONE: Record<TaskPriority, StatusTone> = {
  high: 'destructive',
  medium: 'info',
  low: 'muted',
}

/** A person as shown next to a task (assignee, author). */
export type PersonRef = { id: string; full_name: string; avatar_url: string | null }

/** A project as shown next to a task. */
export type ProjectRef = { id: string; code: string; name: string }

/** What a list or a board needs for one task. */
export type TaskListItem = Pick<
  TaskRow,
  | 'id'
  | 'title'
  | 'status'
  | 'priority'
  | 'due_date'
  | 'project_id'
  | 'assignee_id'
  | 'position'
  | 'tags'
  | 'updated_at'
> & {
  project: ProjectRef | null
  assignee: PersonRef | null
}

export type TaskComment = Tables<'task_comments'> & { author: PersonRef | null }

/** Everything the detail page shows. */
export type TaskDetail = TaskRow & {
  project: ProjectRef | null
  assignee: PersonRef | null
  comments: TaskComment[]
}

/** Deadline buckets offered by the list filter. */
export type DueFilter = 'overdue' | 'today' | 'week' | 'none'

export const DUE_FILTER_LABEL: Record<DueFilter, string> = {
  overdue: 'In ritardo',
  today: 'Oggi',
  week: 'Entro 7 giorni',
  none: 'Senza scadenza',
}

export type TaskFilters = {
  q?: string
  status?: TaskStatus[]
  priority?: TaskPriority[]
  /** Project ids; the special value `none` selects tasks without a project. */
  projectId?: string[]
  /** Profile ids; the special value `none` selects unassigned tasks. */
  assigneeId?: string[]
  due?: DueFilter
  /** Only tasks assigned to the given profile. */
  mine?: string
  /** Shortcut for "everything but done". */
  open?: boolean
}

export type TaskKpis = {
  open: number
  dueThisWeek: number
  overdue: number
  doneLast30Days: number
}

export function isOverdue(task: Pick<TaskRow, 'status' | 'due_date'>, today: string) {
  return task.status !== 'done' && task.due_date !== null && task.due_date < today
}
