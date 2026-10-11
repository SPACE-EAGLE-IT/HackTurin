import { ReportsMap } from '@/components/segnalazioni/reports-map'
import { ReportTable } from '@/components/segnalazioni/report-table'
import { ReportToolbar } from '@/components/segnalazioni/report-toolbar'
import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import PageHeader from '@/components/ds/page-header'
import { ListSurface } from '@/components/list-surface'
import { requirePageAccess } from '@/lib/access/guard'
import { CAPS } from '@/lib/civic/cap'
import { CATEGORIES } from '@/lib/civic/categories'
import { enumListParam, enumParam, firstParam, type SearchParams } from '@/lib/search-params'
import { getReportKpis, listReports } from '@/lib/segnalazioni/queries'
import { REPORT_SOURCES, REPORT_STATUSES, type ReportFilters } from '@/lib/segnalazioni/types'

const SLUGS = CATEGORIES.map(c => c.slug as string)

export default async function SegnalazioniPage(props: { searchParams: Promise<SearchParams> }) {
  await requirePageAccess('segnalazioni')
  const params = await props.searchParams
  const status = enumListParam(params, 'stato', REPORT_STATUSES)
  const filters: ReportFilters = {
    q: firstParam(params, 'q')?.trim() || undefined,
    status: status.length ? status : ['open', 'in_progress'],
    category: enumListParam(params, 'categoria', SLUGS),
    source: enumListParam(params, 'fonte', REPORT_SOURCES),
    cap: enumListParam(params, 'cap', CAPS),
  }
  const vista = enumParam(params, 'vista', ['lista', 'mappa'] as const) ?? 'lista'
  const [reports, kpis] = await Promise.all([listReports(filters), getReportKpis()])

  return (
    <div className='space-y-6'>
      <PageHeader title='Segnalazioni' description='Dai cittadini e dai POD, le più urgenti per prime.' />
      <KpiGrid count={4}>
        <KpiCard title='Aperte' value={kpis.open} tone='warning' />
        <KpiCard title='In lavorazione' value={kpis.inProgress} tone='info' />
        <KpiCard title='Risolte in 30 giorni' value={kpis.resolved30} tone='success' />
        <KpiCard title='Aperte da POD' value={kpis.fromPods} />
      </KpiGrid>
      <ListSurface toolbar={<ReportToolbar resultCount={reports.length} />}>
        {vista === 'mappa' ? (
          <ReportsMap reports={reports} />
        ) : (
          <ReportTable reports={reports} cornice={false} />
        )}
      </ListSurface>
    </div>
  )
}
