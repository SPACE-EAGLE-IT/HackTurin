import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { DashboardKpis } from '@/components/dashboard/dashboard-kpis'
import { HelpDeskKpis } from '@/components/dashboard/help-desk-kpis'
import { Data } from '@/components/ds/data'
import { EmptyState } from '@/components/ds/empty-state'
import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import { MeterRow } from '@/components/ds/meter-row'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import PageHeader from '@/components/ds/page-header'
import { SectionCard } from '@/components/ds/section-card'
import { TaskStatusBadge } from '@/components/tasks/task-badges'
import { Button } from '@/components/ui/button'
import { requirePageAccess } from '@/lib/access/guard'
import { requireSession } from '@/lib/auth/session'
import { getDashboardData } from '@/lib/dashboard/queries'
import { completionPercent } from '@/lib/projects/types'
import type { TaskListItem } from '@/lib/tasks/types'

export const metadata: Metadata = { title: 'Panoramica' }

export default async function DashboardPage() {
  await requirePageAccess('dashboard')
  const session = await requireSession()
  const { kpis, myTasks, activeProjects, tickets, city } = await getDashboardData(session.profile.id)
  const firstName = session.profile.full_name.trim().split(/\s+/)[0] || session.profile.full_name

  return (
    <>
      <PageHeader title='Panoramica' description={`Ciao ${firstName}, ecco la città e il lavoro di oggi.`} />

      {city && (
        <SectionCard title='La città' action={<AllLink href='/segnalazioni' />}>
          <KpiGrid count={4}>
            <KpiCard title='Segnalazioni aperte' value={city.reports.open} tone='warning' />
            <KpiCard title='In lavorazione' value={city.reports.inProgress} tone='info' />
            <KpiCard title='POD online' display={`${city.fleet.online}/${city.fleet.total}`} />
            <KpiCard
              title='Fondo volontari'
              display={`${city.fund.raised.toLocaleString('it-IT')} €`}
              hint={`${city.fund.missions} missioni completate`}
            />
          </KpiGrid>
        </SectionCard>
      )}

      <DashboardKpis kpis={kpis} />

      <div className='grid gap-6 lg:grid-cols-2'>
        <SectionCard title='I miei interventi' action={<AllLink href='/tasks?mie=1' />}>
          {myTasks.length === 0 ? (
            <EmptyState compatto testo='Nessun intervento assegnato a te' />
          ) : (
            <MobileRowList>
              {myTasks.map((task, index) => (
                <MobileRow
                  key={task.id}
                  index={index}
                  title={task.title}
                  meta={taskMeta(task)}
                  signal={<TaskStatusBadge status={task.status} size='sm' />}
                  href={`/tasks/${task.id}`}
                />
              ))}
            </MobileRowList>
          )}
        </SectionCard>

        <SectionCard title='Appalti attivi' action={<AllLink href='/projects' />}>
          {activeProjects.length === 0 ? (
            <EmptyState compatto testo='Nessun appalto attivo' />
          ) : (
            <div className='space-y-3'>
              {activeProjects.map(project => (
                <MeterRow
                  key={project.id}
                  label={
                    <Link href={`/projects/${project.id}`} className='hover:underline'>
                      {project.code} · {project.name}
                    </Link>
                  }
                  labelClassName='w-44'
                  value={`${project.progress.tasksDone}/${project.progress.tasksTotal}`}
                  valueClassName='w-12 text-right text-sm font-medium tabular-nums'
                  pct={completionPercent(project.progress)}
                  fillClassName='bg-success'
                  title={
                    project.progress.tasksOverdue > 0
                      ? `${project.progress.tasksOverdue} interventi in ritardo`
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {tickets && (
        <SectionCard title='Help desk' action={<AllLink href='/help-desk' />}>
          <HelpDeskKpis kpis={tickets} />
        </SectionCard>
      )}
    </>
  )
}

function AllLink({ href }: { href: string }) {
  return (
    <Button variant='ghost' size='sm' asChild>
      <Link href={href}>Tutte</Link>
    </Button>
  )
}

function taskMeta(task: TaskListItem): ReactNode[] {
  const meta: ReactNode[] = []
  if (task.project) meta.push(task.project.code)
  if (task.due_date) meta.push(<Data key='due' valore={task.due_date} forma='corta' />)
  return meta
}
