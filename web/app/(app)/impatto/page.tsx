import { Avviso } from '@/components/ds/avviso'
import PageHeader from '@/components/ds/page-header'
import { SponsorshipTable } from '@/components/fondo/fund-tables'
import { AdoptForm, type PlanOption } from '@/components/impatto/adopt-form'
import { PaymentConfirm } from '@/components/impatto/payment-confirm'
import { ListSurface } from '@/components/list-surface'
import { requirePageAccess } from '@/lib/access/guard'
import { requireSession } from '@/lib/auth/session'
import { listSponsorships } from '@/lib/impatto/queries'
import { ADOPTION_PLANS, paymentsConfigured } from '@/lib/payments/stripe'
import { firstParam, type SearchParams } from '@/lib/search-params'

const PLANS: PlanOption[] = (Object.keys(ADOPTION_PLANS) as PlanOption['key'][]).map(key => ({
  key,
  label: ADOPTION_PLANS[key].label,
  amount: ADOPTION_PLANS[key].amount,
}))

export default async function ImpattoPage(props: { searchParams: Promise<SearchParams> }) {
  await requirePageAccess('impatto')
  const [params, session] = await Promise.all([props.searchParams, requireSession()])
  const sessionId = firstParam(params, 'sessione')
  const sponsorships = await listSponsorships()
  const lastCompany = sponsorships.find(row => row.company_name)?.company_name ?? ''

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Impatto'
        description='Le zone adottate e il loro report di impatto sulla comunità locale.'
      />
      {sessionId?.startsWith('cs_') && <PaymentConfirm sessionId={sessionId} />}
      <ListSurface toolbar={<p className='text-sm font-medium'>Le tue adozioni</p>}>
        <SponsorshipTable sponsorships={sponsorships} />
      </ListSurface>
      {!paymentsConfigured() && (
        <Avviso tono='warning'>
          I pagamenti non sono ancora attivi: l’adozione si potrà completare a breve.
        </Avviso>
      )}
      <AdoptForm defaultCompany={lastCompany || session.profile.full_name} plans={PLANS} />
    </div>
  )
}
