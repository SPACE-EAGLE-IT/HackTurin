import Link from 'next/link'
import { notFound } from 'next/navigation'

import { BackLink } from '@/components/ds/back-link'
import { Data } from '@/components/ds/data'
import PageHeader from '@/components/ds/page-header'
import { TaskPriorityBadge, TaskStatusBadge } from '@/components/tasks/task-badges'
import { TaskDetail } from '@/components/tasks/task-detail'
import { TaskHeaderActions } from '@/components/tasks/task-header-actions'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { requireSession } from '@/lib/auth/session'
import { listPeople } from '@/lib/people/queries'
import { listProjects } from '@/lib/projects/queries'
import { getTask } from '@/lib/tasks/queries'
import type { ProjectRef } from '@/lib/tasks/types'
import { uuidSchema } from '@/lib/validation'

export default async function TaskPage(props: { params: Promise<{ taskId: string }> }) {
  await requirePageAccess('tasks')
  const { taskId } = await props.params
  // A malformed id is "not found", not a database error.
  if (!uuidSchema.safeParse(taskId).success) notFound()

  const [task, projects, people, canWrite, session] = await Promise.all([
    getTask(taskId),
    listProjects(),
    listPeople(),
    can('tasks', 'write'),
    requireSession(),
  ])
  if (!task) notFound()

  const projectRefs: ProjectRef[] = projects.map(({ id, code, name }) => ({ id, code, name }))

  return (
    <div className='space-y-6'>
      <BackLink href='/tasks'>Tutte le task</BackLink>
      <PageHeader
        title={task.title}
        badges={
          <>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
          </>
        }
        meta={
          <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
            {task.project && (
              <>
                <Link
                  href={`/projects/${task.project.id}`}
                  className='hover:text-foreground underline-offset-4 hover:underline'
                >
                  {task.project.code} · {task.project.name}
                </Link>
                <span aria-hidden>·</span>
              </>
            )}
            <span>{task.assignee ? `Assegnata a ${task.assignee.full_name}` : 'Non assegnata'}</span>
            <span aria-hidden>·</span>
            <span>Scadenza {task.due_date ? <Data valore={task.due_date} forma='corta' /> : '—'}</span>
          </div>
        }
        actions={canWrite ? <TaskHeaderActions taskId={task.id} status={task.status} /> : undefined}
      />
      <TaskDetail
        task={task}
        projects={projectRefs}
        people={people}
        canWrite={canWrite}
        currentProfileId={session.profile.id}
      />
    </div>
  )
}
