import { can } from '@/lib/access/queries'
import { getTicketKpis } from '@/lib/help-desk/queries'
import type { TicketKpis } from '@/lib/help-desk/types'
import { listProjects } from '@/lib/projects/queries'
import { publicFleet, publicFund } from '@/lib/public/queries'
import { getReportKpis } from '@/lib/segnalazioni/queries'
import type { ReportKpis } from '@/lib/segnalazioni/types'
import type { ProjectListItem } from '@/lib/projects/types'
import { getTaskKpis, listTasks } from '@/lib/tasks/queries'
import type { TaskKpis, TaskListItem } from '@/lib/tasks/types'

export type DashboardData = {
  kpis: TaskKpis
  /** Open tasks assigned to the user, closest deadline first. */
  myTasks: TaskListItem[]
  activeProjects: ProjectListItem[]
  /** Help desk numbers, or `null` when the person has no access to the module. */
  tickets: TicketKpis | null
  /** City numbers for staff who see reports, or `null`. */
  city: {
    reports: ReportKpis
    fleet: { online: number; total: number }
    fund: { raised: number; missions: number }
  } | null
}

export async function getDashboardData(profileId: string): Promise<DashboardData> {
  const [kpis, myTasks, activeProjects, canSeeTickets] = await Promise.all([
    getTaskKpis(),
    listTasks({ mine: profileId, open: true }),
    listProjects({ status: ['active'] }),
    can('help_desk', 'read'),
  ])
  const [tickets, canSeeReports] = await Promise.all([
    canSeeTickets ? getTicketKpis() : null,
    can('segnalazioni', 'read'),
  ])
  let city: DashboardData['city'] = null
  if (canSeeReports) {
    const [reports, fleet, fund] = await Promise.all([getReportKpis(), publicFleet(), publicFund()])
    city = { reports, fleet, fund: { raised: Number(fund.raised), missions: fund.missions_verified } }
  }
  return { kpis, myTasks: myTasks.slice(0, 6), activeProjects, tickets, city }
}
