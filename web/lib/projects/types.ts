import type { StatusTone } from '@/components/ds/status-badge'
import type { Enums, Tables } from '@/lib/supabase/database.types'
import type { PersonRef } from '@/lib/tasks/types'

export type ProjectStatus = Enums<'project_status'>
export type ProjectRow = Tables<'projects'>

export const PROJECT_STATUSES = ['active', 'paused', 'closed'] as const satisfies readonly ProjectStatus[]

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Attiva',
  paused: 'In pausa',
  closed: 'Chiusa',
}

export const PROJECT_STATUS_TONE: Record<ProjectStatus, StatusTone> = {
  active: 'success',
  paused: 'warning',
  closed: 'muted',
}

/** Task counters of one project. */
export type ProjectProgress = {
  tasksTotal: number
  tasksDone: number
  tasksOverdue: number
}

export type ProjectListItem = Pick<
  ProjectRow,
  'id' | 'code' | 'name' | 'client_name' | 'status' | 'due_date' | 'budget_hours' | 'updated_at'
> & {
  owner: PersonRef | null
  progress: ProjectProgress
}

export type ProjectDetail = ProjectRow & { owner: PersonRef | null; progress: ProjectProgress }

export type ProjectFilters = {
  q?: string
  status?: ProjectStatus[]
}

export function completionPercent(progress: ProjectProgress) {
  return progress.tasksTotal === 0 ? 0 : Math.round((progress.tasksDone / progress.tasksTotal) * 100)
}
