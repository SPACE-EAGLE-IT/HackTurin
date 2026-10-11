import PageHeader from '@/components/ds/page-header'
import { DownloadCsvButton, FundKpis, FundTabs } from '@/components/fondo/fund-header'
import { DonationTable, SponsorshipTable } from '@/components/fondo/fund-tables'
import { ReimbursementTable } from '@/components/fondo/reimbursement-table'
import { ListSurface } from '@/components/list-surface'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { getFundKpis, listDonations, listExpensesToReimburse, listSponsorships } from '@/lib/fondo/queries'
import { FUND_TABS } from '@/lib/fondo/types'
import { PARTNER_ETS } from '@/lib/payments/stripe'
import { enumParam, type SearchParams } from '@/lib/search-params'

export default async function FondoPage(props: { searchParams: Promise<SearchParams> }) {
  await requirePageAccess('fondo')
  const params = await props.searchParams
  const tab = enumParam(params, 'tab', FUND_TABS) ?? 'rimborsi'

  const [kpis, canWrite] = await Promise.all([getFundKpis(), can('fondo', 'write')])

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Fondo e adozioni'
        description={`Donazioni a ${PARTNER_ETS}, rimborsi spese ai volontari e zone adottate.`}
        actions={<DownloadCsvButton />}
      />
      <FundKpis kpis={kpis} tab={tab} />
      <ListSurface toolbar={<FundTabs tab={tab} />}>
        {tab === 'rimborsi' ? (
          <ReimbursementTable expenses={await listExpensesToReimburse()} canWrite={canWrite} />
        ) : tab === 'donazioni' ? (
          <DonationTable donations={await listDonations()} />
        ) : (
          <SponsorshipTable sponsorships={await listSponsorships()} />
        )}
      </ListSurface>
    </div>
  )
}
