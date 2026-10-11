import { DonateBox } from '@/components/civic/donate-box'
import { KpiCard, KpiGrid } from '@/components/ds/kpi-card'
import PageHeader from '@/components/ds/page-header'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { PARTNER_ETS, paymentsConfigured } from '@/lib/payments/stripe'
import { publicFund } from '@/lib/public/queries'

export const metadata = { title: 'Dona' }
export const dynamic = 'force-dynamic'

export default async function DonaPage({ searchParams }: { searchParams: Promise<{ sessione?: string }> }) {
  const [{ sessione }, fund] = await Promise.all([searchParams, publicFund()])
  const eur = (n: number | string) => `${Number(n).toLocaleString('it-IT', { maximumFractionDigits: 0 })} €`
  return (
    <div className='mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6'>
      <PageHeader
        title='Sostieni chi si prende cura della città'
        description={`Le donazioni vanno a ${PARTNER_ETS} e coprono rimborsi spese e materiali dei volontari.`}
      />
      <KpiGrid count={4}>
        <KpiCard title='Raccolti' display={eur(fund.raised)} hint={`${fund.donors} donazioni`} />
        <KpiCard title='Rimborsati ai volontari' display={eur(fund.reimbursed)} />
        <KpiCard title='Missioni completate' value={fund.missions_verified} tone='success' />
        <KpiCard
          title='Rifiuti raccolti'
          display={`${Number(fund.kg_collected).toLocaleString('it-IT')} kg`}
        />
      </KpiGrid>
      <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]'>
        <DonateBox enabled={paymentsConfigured()} sessionId={sessione} />
        <PannelloScheda occhiello='Come usiamo i fondi'>
          <RigaDettaglio label='Beneficiario'>{PARTNER_ETS}</RigaDettaglio>
          <RigaDettaglio label='A cosa servono'>Rimborsi spese e materiali per le missioni</RigaDettaglio>
          <RigaDettaglio label='Limiti'>
            Rimborsi entro 10 € al giorno e 150 € al mese per volontario
          </RigaDettaglio>
          <RigaDettaglio label='Deducibilità'>Erogazione liberale a un ETS (art. 83 CTS)</RigaDettaglio>
          <RigaDettaglio label='Pagamento'>Stripe, nessun dato di carta passa da noi</RigaDettaglio>
        </PannelloScheda>
      </div>
    </div>
  )
}
