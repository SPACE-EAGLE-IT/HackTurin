import { notFound } from 'next/navigation'

import { BackLink } from '@/components/ds/back-link'
import PageHeader from '@/components/ds/page-header'
import { PodStateBadge } from '@/components/pod/pod-badges'
import { PodHeaderActions } from '@/components/pod/pod-header-actions'
import { PodLog } from '@/components/pod/pod-log'
import { PodReadingsChart } from '@/components/pod/pod-readings-chart'
import { PodReports } from '@/components/pod/pod-reports'
import { PodFacts, PodKeys } from '@/components/pod/pod-side'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { getDevice } from '@/lib/pod/queries'
import { deviceTypeLabel } from '@/lib/pod/types'
import { uuidSchema } from '@/lib/validation'

export default async function PodDetailPage(props: { params: Promise<{ deviceId: string }> }) {
  await requirePageAccess('pod')
  const { deviceId } = await props.params
  // A malformed id is "not found", not a database error.
  if (!uuidSchema.safeParse(deviceId).success) notFound()

  const [device, canWrite] = await Promise.all([getDevice(deviceId), can('pod', 'write')])
  if (!device) notFound()

  return (
    <div className='space-y-6'>
      <BackLink href='/pod'>Tutti i POD</BackLink>
      <PageHeader
        title={device.name}
        badges={<PodStateBadge device={device} />}
        meta={
          <p className='text-muted-foreground text-sm'>
            {deviceTypeLabel(device.type)}
            {device.label ? ` · ${device.label}` : ''}
          </p>
        }
        actions={canWrite ? <PodHeaderActions deviceId={device.id} active={device.active} /> : undefined}
      />
      <div className='grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]'>
        <div className='space-y-6'>
          <PodReadingsChart readings={device.readings} metrics={device.metrics} />
          <PodLog rows={device.logs} title='Cosa ha inviato' showDevice={false} />
          <PodReports reports={device.reports} />
        </div>
        <div className='space-y-6'>
          <PodFacts device={device} />
          <PodKeys keys={device.keys} canWrite={canWrite} />
        </div>
      </div>
    </div>
  )
}
