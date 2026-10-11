import { notFound } from 'next/navigation'

import { Avviso } from '@/components/ds/avviso'
import { BackLink } from '@/components/ds/back-link'
import PageHeader from '@/components/ds/page-header'
import { SponsorshipStatusBadge } from '@/components/fondo/fund-tables'
import { ImpactReport } from '@/components/impatto/impact-report'
import { PrintButton, WindowToggle } from '@/components/impatto/report-controls'
import { requirePageAccess } from '@/lib/access/guard'
import { getImpactReport, getSponsorship, IMPACT_WINDOWS } from '@/lib/impatto/queries'
import { PARTNER_ETS } from '@/lib/payments/stripe'
import { enumParam, type SearchParams } from '@/lib/search-params'
import { uuidSchema } from '@/lib/validation'

export default async function ImpactReportPage(props: {
  params: Promise<{ sponsorshipId: string }>
  searchParams: Promise<SearchParams>
}) {
  await requirePageAccess('impatto')
  const [{ sponsorshipId }, search] = await Promise.all([props.params, props.searchParams])
  if (!uuidSchema.safeParse(sponsorshipId).success) notFound()

  const sponsorship = await getSponsorship(sponsorshipId)
  if (!sponsorship) notFound()

  const hasPeriod = Boolean(sponsorship.starts_on)
  const window = hasPeriod ? (enumParam(search, 'periodo', IMPACT_WINDOWS) ?? 'adozione') : '12mesi'
  const report = await getImpactReport(sponsorship, window)

  return (
    <div className='space-y-6'>
      <div className='print:hidden'>
        <BackLink href='/impatto'>Tutte le adozioni</BackLink>
      </div>
      <PageHeader
        title={`Report di impatto · ${sponsorship.company_name}`}
        badges={<SponsorshipStatusBadge status={sponsorship.status} />}
        meta={
          <span className='text-muted-foreground text-sm'>
            Adozione {sponsorship.plan === 'annuale' ? 'annuale' : 'trimestrale'} a favore di {PARTNER_ETS}
          </span>
        }
        actions={<PrintButton />}
      />
      {sponsorship.status === 'pending' && (
        <Avviso tono='warning'>
          Adozione in attesa di pagamento: il report mostra gli ultimi 12 mesi delle zone scelte.
        </Avviso>
      )}
      <WindowToggle value={window} canAdoption={hasPeriod} />
      <ImpactReport report={report} caps={sponsorship.caps} />
    </div>
  )
}
