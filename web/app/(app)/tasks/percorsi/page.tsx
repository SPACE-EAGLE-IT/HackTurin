import { BackLink } from '@/components/ds/back-link'
import PageHeader from '@/components/ds/page-header'
import { RoutePlanner, type RoutableTask } from '@/components/tasks/route-planner'
import { requirePageAccess } from '@/lib/access/guard'
import { parsePoint } from '@/lib/civic/geo'
import { listPeople } from '@/lib/people/queries'
import { listRoutableTasks } from '@/lib/tasks/queries'

export default async function PercorsiPage() {
  await requirePageAccess('tasks', 'write')
  const [rows, people] = await Promise.all([listRoutableTasks(), listPeople()])
  const tasks: RoutableTask[] = rows.flatMap(t => {
    const p = parsePoint(t.report?.geom)
    return p && t.report
      ? [
          {
            id: t.id,
            title: t.title,
            category: t.report.category,
            severity: t.report.severity,
            lat: p.lat,
            lon: p.lon,
          },
        ]
      : []
  })
  return (
    <div className='space-y-6'>
      <BackLink href='/tasks'>Interventi</BackLink>
      <PageHeader title='Percorsi' description='Giri ottimizzati per le squadre, dagli interventi aperti.' />
      <RoutePlanner tasks={tasks} people={people} />
    </div>
  )
}
