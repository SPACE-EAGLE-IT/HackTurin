import { addDays, todayKey } from '@/lib/date-keys'
import { createClient } from '@/lib/supabase/server'
import { escapeLike } from '@/lib/validation'

import type { TaskComment, TaskDetail, TaskFilters, TaskKpis, TaskListItem } from './types'

const PERSON = 'id, full_name, avatar_url'
const PROJECT = 'id, code, name'
const LIST_COLUMNS = `id, title, status, priority, due_date, project_id, assignee_id, position, tags, updated_at, project:projects(${PROJECT}), assignee:profiles!tasks_assignee_id_fkey(${PERSON})`

/** Tasks matching the filters, ordered by deadline (closest first, undated last). */
export async function listTasks(filters: TaskFilters = {}): Promise<TaskListItem[]> {
  const supabase = await createClient()
  let query = supabase.from('tasks').select(LIST_COLUMNS)

  if (filters.q) query = query.ilike('title', `%${escapeLike(filters.q)}%`)
  if (filters.status?.length) query = query.in('status', filters.status)
  if (filters.open) query = query.neq('status', 'done')
  if (filters.priority?.length) query = query.in('priority', filters.priority)
  if (filters.mine) query = query.eq('assignee_id', filters.mine)
  if (filters.projectId?.length) query = query.or(orNullable('project_id', filters.projectId))
  if (filters.assigneeId?.length) query = query.or(orNullable('assignee_id', filters.assigneeId))

  const today = todayKey()
  switch (filters.due) {
    case 'overdue':
      query = query.lt('due_date', today).neq('status', 'done')
      break
    case 'today':
      query = query.eq('due_date', today)
      break
    case 'week':
      query = query.gte('due_date', today).lte('due_date', addDays(today, 7))
      break
    case 'none':
      query = query.is('due_date', null)
      break
  }

  const { data, error } = await query
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('position')
    .order('created_at', { ascending: false })
    .overrideTypes<TaskListItem[], { merge: false }>()
  if (error) throw error
  return data
}

/** One task with its relations and comments, or `null`. */
export async function getTask(id: string): Promise<TaskDetail | null> {
  const supabase = await createClient()
  const [task, comments] = await Promise.all([
    supabase
      .from('tasks')
      .select(`*, project:projects(${PROJECT}), assignee:profiles!tasks_assignee_id_fkey(${PERSON})`)
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<Omit<TaskDetail, 'comments'>, { merge: false }>(),
    listTaskComments(id),
  ])
  if (task.error) throw task.error
  if (!task.data) return null
  return { ...task.data, comments }
}

export async function listTaskComments(taskId: string): Promise<TaskComment[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('task_comments')
    .select(`*, author:profiles(${PERSON})`)
    .eq('task_id', taskId)
    .order('created_at')
    .overrideTypes<TaskComment[], { merge: false }>()
  if (error) throw error
  return data
}

/** The four numbers of the dashboard and of the list header. */
export async function getTaskKpis(filters: Pick<TaskFilters, 'mine' | 'projectId'> = {}): Promise<TaskKpis> {
  const supabase = await createClient()
  let query = supabase.from('tasks').select('status, due_date, completed_at')
  if (filters.mine) query = query.eq('assignee_id', filters.mine)
  if (filters.projectId?.length) query = query.in('project_id', filters.projectId)
  const { data, error } = await query
  if (error) throw error

  const today = todayKey()
  const weekEnd = addDays(today, 7)
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const kpis: TaskKpis = { open: 0, dueThisWeek: 0, overdue: 0, doneLast30Days: 0 }
  for (const task of data) {
    if (task.status === 'done') {
      if (task.completed_at && task.completed_at >= monthAgo) kpis.doneLast30Days++
      continue
    }
    kpis.open++
    if (task.due_date && task.due_date < today) kpis.overdue++
    else if (task.due_date && task.due_date <= weekEnd) kpis.dueThisWeek++
  }
  return kpis
}

/** `column.in.(a,b)` plus `column.is.null` when `none` is among the values. */
function orNullable(column: string, values: string[]) {
  const ids = values.filter(value => value !== 'none')
  const parts: string[] = []
  if (ids.length) parts.push(`${column}.in.(${ids.join(',')})`)
  if (values.includes('none')) parts.push(`${column}.is.null`)
  return parts.join(',')
}

/** Open interventions that come from a report, with the report's position (for route planning). */
export async function listRoutableTasks() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select(
      `id, title, priority, status, assignee:profiles!tasks_assignee_id_fkey(${PERSON}), report:reports(id, category, severity, geom)`
    )
    .neq('status', 'done')
    .not('report_id', 'is', null)
    .overrideTypes<
      {
        id: string
        title: string
        priority: string
        status: string
        assignee: { id: string; full_name: string; avatar_url: string | null } | null
        report: { id: string; category: string; severity: number; geom: string } | null
      }[],
      { merge: false }
    >()
  if (error) throw error
  return data
}
