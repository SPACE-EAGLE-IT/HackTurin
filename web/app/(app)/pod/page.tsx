import Link from 'next/link'
import { SmartphoneIcon } from 'lucide-react'

import PageHeader from '@/components/ds/page-header'
import { ListSurface } from '@/components/list-surface'
import { NewPodButton } from '@/components/pod/new-pod-dialog'
import { PodKpis } from '@/components/pod/pod-kpis'
import { PodLog } from '@/components/pod/pod-log'
import { PodTable } from '@/components/pod/pod-table'
import { Button } from '@/components/ui/button'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { getPodTraffic, listDevices, listLogs } from '@/lib/pod/queries'
import { firstParam, type SearchParams } from '@/lib/search-params'
import { createClient } from '@/lib/supabase/server'

export default async function PodPage(props: { searchParams: Promise<SearchParams> }) {
  await requirePageAccess('pod')
  const params = await props.searchParams
  const errorsOnly = firstParam(params, 'errori') === '1'

  // Opens a help-desk ticket for every POD silent for more than 30 minutes; idempotent, best effort.
  const supabase = await createClient()
  try {
    await supabase.rpc('pod_open_offline_tickets')
  } catch {
    // The console works without the tickets.
  }

  const [devices, logs, canWrite] = await Promise.all([
    listDevices(),
    listLogs({ errorsOnly, limit: 60 }),
    can('pod', 'write'),
  ])
  const traffic = await getPodTraffic(devices)

  return (
    <div className='space-y-6'>
      <PageHeader
        title='POD'
        description='Sensori su mezzi e semafori: connessione, traffico API, chiavi.'
        actions={
          <>
            {/* The phone page explains the pairing: Nuovo POD → tipo Telefono → scan the QR. */}
            <Button asChild variant='ghost'>
              <Link href='/pod-telefono' target='_blank'>
                <SmartphoneIcon /> Usa un telefono come POD
              </Link>
            </Button>
            {canWrite && <NewPodButton />}
          </>
        }
      />
      <PodKpis traffic={traffic} />
      <ListSurface toolbar={<p className='text-muted-foreground text-sm'>{devices.length} POD</p>}>
        <PodTable devices={devices} cornice={false} />
      </ListSurface>
      <PodLog rows={logs} errorsToggle live />
    </div>
  )
}
