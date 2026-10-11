'use client'

import { useRouter } from 'next/navigation'

import { ReportMap, type MapDevice } from '@/components/civic/report-map'
import type { ReportListItem } from '@/lib/segnalazioni/types'

/** The operations map: a click on a report opens its detail. */
export function ReportsMap({ reports, devices }: { reports: ReportListItem[]; devices?: MapDevice[] }) {
  const router = useRouter()
  return (
    <div className='h-[60vh] min-h-96 overflow-hidden rounded-md'>
      <ReportMap reports={reports} devices={devices} onSelect={id => router.push(`/segnalazioni/${id}`)} />
    </div>
  )
}
