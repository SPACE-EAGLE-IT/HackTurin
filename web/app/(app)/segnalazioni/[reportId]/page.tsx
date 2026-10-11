import Link from 'next/link'
import { notFound } from 'next/navigation'

import { ReportMap } from '@/components/civic/report-map'
import { BackLink } from '@/components/ds/back-link'
import { Data } from '@/components/ds/data'
import { EmptyState } from '@/components/ds/empty-state'
import PageHeader from '@/components/ds/page-header'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import { CategoryLabel, ReportStatusBadge } from '@/components/segnalazioni/report-badges'
import { ReportActions } from '@/components/segnalazioni/report-actions'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { categoryName } from '@/lib/civic/categories'
import { listPeople } from '@/lib/people/queries'
import { getReport } from '@/lib/segnalazioni/queries'
import { REPORT_SOURCE_LABEL } from '@/lib/segnalazioni/types'
import { TASK_STATUS_LABEL, type TaskStatus } from '@/lib/tasks/types'

const MISSION_LABEL: Record<string, string> = {
  open: 'Aperta',
  assigned: 'Presa in carico',
  submitted: 'Da verificare',
  verified: 'Verificata',
  rejected: 'Respinta',
}

export default async function ReportPage(props: { params: Promise<{ reportId: string }> }) {
  await requirePageAccess('segnalazioni')
  const { reportId } = await props.params
  const [report, people, canIntervene, canPublishMission, canEdit] = await Promise.all([
    getReport(reportId),
    listPeople(),
    can('tasks', 'write'),
    can('missioni', 'admin'),
    can('segnalazioni', 'write'),
  ])
  if (!report) notFound()

  return (
    <div className='space-y-6'>
      <BackLink href='/segnalazioni'>Segnalazioni</BackLink>
      <PageHeader
        title={`${categoryName(report.category)} · CAP ${report.cap}`}
        badges={<ReportStatusBadge status={report.status} />}
        actions={
          <ReportActions
            report={report}
            people={people}
            canIntervene={canIntervene}
            canPublishMission={canPublishMission}
            canEdit={canEdit}
          />
        }
      />
      <div className='grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]'>
        <div className='space-y-6'>
          <SectionCard title='Dove'>
            <div className='h-72 overflow-hidden rounded-md'>
              <ReportMap reports={[report]} fitToReports />
            </div>
          </SectionCard>
          {(report.description || report.photo_url) && (
            <SectionCard title='Cosa è stato visto'>
              <div className='space-y-3 text-sm'>
                {report.description && <p>{report.description}</p>}
                {report.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={report.photo_url}
                    alt='Foto della segnalazione'
                    className='max-h-80 rounded-md object-cover'
                  />
                )}
              </div>
            </SectionCard>
          )}
          <SectionCard title='Interventi e missioni'>
            {report.interventions.length + report.missions.length === 0 ? (
              <EmptyState compatto testo='Nessun intervento né missione ancora.' />
            ) : (
              <ul className='divide-y text-sm'>
                {report.interventions.map(t => (
                  <li key={t.id} className='flex items-center justify-between gap-3 py-2'>
                    <Link href={`/tasks/${t.id}`} className='font-medium hover:underline'>
                      {t.title}
                    </Link>
                    <span className='text-muted-foreground'>
                      Intervento · {TASK_STATUS_LABEL[t.status as TaskStatus] ?? t.status}
                      {t.assignee ? ` · ${t.assignee}` : ''}
                    </span>
                  </li>
                ))}
                {report.missions.map(m => (
                  <li key={m.id} className='flex items-center justify-between gap-3 py-2'>
                    <Link href={`/missioni/${m.id}`} className='font-medium hover:underline'>
                      {m.title}
                    </Link>
                    <span className='text-muted-foreground'>
                      Missione · {MISSION_LABEL[m.status] ?? m.status}
                      {m.volunteer ? ` · ${m.volunteer}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
        <PannelloScheda occhiello='Dettagli'>
          <RigaDettaglio label='Categoria'>
            <CategoryLabel slug={report.category} />
          </RigaDettaglio>
          <RigaDettaglio label='Fonte'>
            {REPORT_SOURCE_LABEL[report.source]}
            {report.device_name ? ` · ${report.device_name}` : ''}
          </RigaDettaglio>
          <RigaDettaglio label='Gravità'>
            <StatusBadge tone={report.severity >= 4 ? 'destructive' : 'warning'} variant='piatta'>
              {report.severity}/5
            </StatusBadge>
          </RigaDettaglio>
          <RigaDettaglio label='Affidabilità'>{Math.round(report.confidence * 100)}%</RigaDettaglio>
          <RigaDettaglio label='Osservazioni'>{report.observations}</RigaDettaglio>
          <RigaDettaglio label='Ricevuta'>
            <Data valore={report.created_at} forma='intera' />
          </RigaDettaglio>
          {report.resolved_at && (
            <RigaDettaglio label='Risolta'>
              <Data valore={report.resolved_at} forma='intera' />
            </RigaDettaglio>
          )}
          <RigaDettaglio label='Coordinate'>
            {report.lat.toFixed(5)}, {report.lon.toFixed(5)}
          </RigaDettaglio>
        </PannelloScheda>
      </div>
    </div>
  )
}
