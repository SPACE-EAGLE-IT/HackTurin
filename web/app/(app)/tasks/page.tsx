import Link from 'next/link'

import PageHeader from '@/components/ds/page-header'
import { Button } from '@/components/ui/button'
import { NewTaskButton } from '@/components/tasks/new-task-dialog'
import { TaskBoard } from '@/components/tasks/task-board'
import { TaskKpis } from '@/components/tasks/task-kpis'
import { ListSurface } from '@/components/list-surface'
import { TaskTable } from '@/components/tasks/task-table'
import { TaskToolbar } from '@/components/tasks/task-toolbar'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { requireSession } from '@/lib/auth/session'
import { listPeople } from '@/lib/people/queries'
import { listProjects } from '@/lib/projects/queries'
import { enumListParam, enumParam, firstParam, listParam, type SearchParams } from '@/lib/search-params'
import { getTaskKpis, listTasks } from '@/lib/tasks/queries'
import {
  DUE_FILTER_LABEL,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type DueFilter,
  type ProjectRef,
  type TaskFilters,
} from '@/lib/tasks/types'

const VIEWS = ['lista', 'board'] as const
const DUE_FILTERS = Object.keys(DUE_FILTER_LABEL) as DueFilter[]
// Ids go into a PostgREST `or` filter as text: only uuids and the `none` marker pass.
const ID_OR_NONE = /^(none|[0-9a-f-]{36})$/i

export default async function TasksPage(props: { searchParams: Promise<SearchParams> }) {
  await requirePageAccess('tasks')
  const [params, session] = await Promise.all([props.searchParams, requireSession()])

  const filters: TaskFilters = {
    q: firstParam(params, 'q')?.trim() || undefined,
    status: enumListParam(params, 'stato', TASK_STATUSES),
    priority: enumListParam(params, 'priorita', TASK_PRIORITIES),
    projectId: listParam(params, 'commessa').filter(value => ID_OR_NONE.test(value)),
    assigneeId: listParam(params, 'persona').filter(value => ID_OR_NONE.test(value)),
    due: enumParam(params, 'scadenza', DUE_FILTERS),
    mine: firstParam(params, 'mie') === '1' ? session.profile.id : undefined,
  }
  const vista = enumParam(params, 'vista', VIEWS) ?? 'lista'

  const [tasks, kpis, projects, people, canWrite] = await Promise.all([
    listTasks(filters),
    getTaskKpis(),
    listProjects(),
    listPeople(),
    can('tasks', 'write'),
  ])
  const projectRefs: ProjectRef[] = projects.map(({ id, code, name }) => ({ id, code, name }))

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Interventi'
        description='Lavori sul campo, spesso nati da una segnalazione.'
        actions={
          canWrite ? (
            <>
              <Button asChild variant='outline'>
                <Link href='/tasks/percorsi'>Percorsi</Link>
              </Button>
              <NewTaskButton projects={projectRefs} people={people} />
            </>
          ) : undefined
        }
      />
      <TaskKpis kpis={kpis} />
      <div className='space-y-4'>
        {vista === 'board' ? (
          <>
            <TaskToolbar projects={projectRefs} people={people} resultCount={tasks.length} />
            <TaskBoard tasks={tasks} canWrite={canWrite} />
          </>
        ) : (
          <ListSurface
            toolbar={<TaskToolbar projects={projectRefs} people={people} resultCount={tasks.length} />}
          >
            <TaskTable tasks={tasks} cornice={false} />
          </ListSurface>
        )}
      </div>
    </div>
  )
}
