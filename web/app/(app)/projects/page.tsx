import PageHeader from '@/components/ds/page-header'
import { NewProjectButton } from '@/components/projects/new-project-dialog'
import { ProjectKpis } from '@/components/projects/project-kpis'
import { ProjectTable } from '@/components/projects/project-table'
import { ListSurface } from '@/components/list-surface'
import { ProjectToolbar } from '@/components/projects/project-toolbar'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { listPeople } from '@/lib/people/queries'
import { listProjects } from '@/lib/projects/queries'
import { PROJECT_STATUSES, type ProjectStatus } from '@/lib/projects/types'
import { enumListParam, firstParam, type SearchParams } from '@/lib/search-params'

export default async function ProjectsPage(props: { searchParams: Promise<SearchParams> }) {
  await requirePageAccess('projects')
  const searchParams = await props.searchParams
  const q = firstParam(searchParams, 'q')?.trim() || undefined
  const status = enumListParam(searchParams, 'stato', PROJECT_STATUSES)

  const [allProjects, projects, people, canWrite] = await Promise.all([
    listProjects(),
    listProjects({ q, status }),
    listPeople(),
    can('projects', 'write'),
  ])

  const counts: Record<ProjectStatus, number> = { active: 0, paused: 0, closed: 0 }
  for (const project of allProjects) counts[project.status] += 1

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Appalti'
        description='Contratti di raccolta e manutenzione, per zona.'
        actions={canWrite ? <NewProjectButton people={people} /> : undefined}
      />
      <ProjectKpis counts={counts} />
      <section className='space-y-4'>
        <ListSurface toolbar={<ProjectToolbar resultCount={projects.length} />}>
          <ProjectTable projects={projects} cornice={false} />
        </ListSurface>
      </section>
    </div>
  )
}
