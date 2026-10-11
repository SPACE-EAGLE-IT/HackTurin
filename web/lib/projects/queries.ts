import { todayKey } from '@/lib/date-keys'
import { createClient } from '@/lib/supabase/server'
import { escapeLike } from '@/lib/validation'

import type { ProjectDetail, ProjectFilters, ProjectListItem, ProjectProgress } from './types'

const OWNER = 'owner:profiles(id, full_name, avatar_url)'
const LIST_COLUMNS = `id, code, name, client_name, status, due_date, budget_hours, updated_at, ${OWNER}`

type ListRow = Omit<ProjectListItem, 'progress'>

/** Projects matching the filters, with their task counters. */
export async function listProjects(filters: ProjectFilters = {}): Promise<ProjectListItem[]> {
  const supabase = await createClient()
  let query = supabase.from('projects').select(LIST_COLUMNS)
  if (filters.q)
    query = query.or(`name.ilike.%${escapeLike(filters.q)}%,code.ilike.%${escapeLike(filters.q)}%`)
  if (filters.status?.length) query = query.in('status', filters.status)

  const { data, error } = await query
    .order('status')
    .order('due_date', { ascending: true, nullsFirst: false })
    .overrideTypes<ListRow[], { merge: false }>()
  if (error) throw error

  const progress = await progressByProject(data.map(project => project.id))
  return data.map(project => ({ ...project, progress: progress.get(project.id) ?? EMPTY_PROGRESS }))
}

export async function getProject(id: string): Promise<ProjectDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('projects')
    .select(`*, ${OWNER}`)
    .eq('id', id)
    .maybeSingle()
    .overrideTypes<Omit<ProjectDetail, 'progress'>, { merge: false }>()
  if (error) throw error
  if (!data) return null
  const progress = await progressByProject([id])
  return { ...data, progress: progress.get(id) ?? EMPTY_PROGRESS }
}

const EMPTY_PROGRESS: ProjectProgress = { tasksTotal: 0, tasksDone: 0, tasksOverdue: 0 }

/** Counts tasks per project in one query; the volumes of a hackathon do not need a view. */
async function progressByProject(projectIds: string[]): Promise<Map<string, ProjectProgress>> {
  const map = new Map<string, ProjectProgress>()
  if (projectIds.length === 0) return map

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('project_id, status, due_date')
    .in('project_id', projectIds)
  if (error) throw error

  const today = todayKey()
  for (const task of data) {
    if (!task.project_id) continue
    const progress = map.get(task.project_id) ?? { tasksTotal: 0, tasksDone: 0, tasksOverdue: 0 }
    progress.tasksTotal++
    if (task.status === 'done') progress.tasksDone++
    else if (task.due_date && task.due_date < today) progress.tasksOverdue++
    map.set(task.project_id, progress)
  }
  return map
}
