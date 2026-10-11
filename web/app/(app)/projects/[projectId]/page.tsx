import { notFound } from 'next/navigation'

import { BackLink } from '@/components/ds/back-link'
import { Data } from '@/components/ds/data'
import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import PageHeader from '@/components/ds/page-header'
import { SectionCard } from '@/components/ds/section-card'
import { Person } from '@/components/people/person-ref'
import { ProjectActions } from '@/components/projects/project-actions'
import { ProjectProperties } from '@/components/projects/project-properties'
import { ProjectStatusBadge } from '@/components/projects/project-status-badge'
import { NewTaskButton } from '@/components/tasks/new-task-dialog'
import { TaskTable } from '@/components/tasks/task-table'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { numeroIt } from '@/lib/format-number'
import { listPeople } from '@/lib/people/queries'
import { getProject, listProjects } from '@/lib/projects/queries'
import { listReports } from '@/lib/segnalazioni/queries'
import { listTasks } from '@/lib/tasks/queries'
import { uuidSchema } from '@/lib/validation'

export default async function ProjectPage(props: { params: Promise<{ projectId: string }> }) {
  await requirePageAccess('projects')
  const { projectId } = await props.params
  // A malformed id would make Postgres throw: treat it as a missing row instead.
  if (!uuidSchema.safeParse(projectId).success) notFound()

  const project = await getProject(projectId)
  if (!project) notFound()

  const canSeeReports = await can('segnalazioni', 'read')
  const zoneReports =
    canSeeReports && project.caps.length
      ? await listReports({ cap: project.caps, status: ['open', 'in_progress'] })
      : []
  const [tasks, projects, people, canWriteProjects, canWriteTasks] = await Promise.all([
    listTasks({ projectId: [projectId] }),
    listProjects(),
    listPeople(),
    can('projects', 'write'),
    can('tasks', 'write'),
  ])

  const projectRefs = projects.map(({ id, code, name }) => ({ id, code, name }))
  const { progress } = project

  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <BackLink href='/projects'>Tutti gli appalti</BackLink>
        <PageHeader
          title={`${project.code} · ${project.name}`}
          description={project.client_name ?? undefined}
          badges={<ProjectStatusBadge status={project.status} />}
          meta={
            <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm'>
              <span className='inline-flex items-center gap-1.5'>
                Responsabile <Person person={project.owner} size='xs' emptyLabel='Nessuno' />
              </span>
              <span aria-hidden>·</span>
              <span>
                Scadenza <Data valore={project.due_date} forma='corta' />
              </span>
              <span aria-hidden>·</span>
              <span>Budget {project.budget_hours == null ? '—' : `${numeroIt(project.budget_hours)} h`}</span>
            </div>
          }
          actions={
            <>
              {canWriteProjects && <ProjectActions projectId={project.id} />}
              {canWriteTasks && (
                <NewTaskButton projects={projectRefs} people={people} defaultProjectId={project.id} />
              )}
            </>
          }
        />
      </div>

      <KpiGrid count={4}>
        <KpiCard
          title='Segnalazioni aperte nella zona'
          value={zoneReports.length}
          hint={project.caps.length ? `CAP ${project.caps.join(', ')}` : 'Nessun CAP assegnato'}
          tone={zoneReports.length > 0 ? 'warning' : 'default'}
        />
        <KpiCard title='Interventi' value={progress.tasksTotal} />
        <KpiCard title='Fatte' value={progress.tasksDone} />
        <KpiCard
          title='In ritardo'
          value={progress.tasksOverdue}
          tone={progress.tasksOverdue > 0 ? 'destructive' : 'default'}
        />
      </KpiGrid>

      <div className='grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]'>
        <SectionCard title='Interventi dell’appalto'>
          <TaskTable tasks={tasks} hideProject emptyTitle='Nessun intervento in questo appalto' />
        </SectionCard>
        <ProjectProperties project={project} people={people} canWrite={canWriteProjects} />
      </div>
    </div>
  )
}
