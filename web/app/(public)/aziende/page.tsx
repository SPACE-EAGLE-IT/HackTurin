import Link from 'next/link'

import { Avviso } from '@/components/ds/avviso'
import PageHeader from '@/components/ds/page-header'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { SectionCard } from '@/components/ds/section-card'
import { Button } from '@/components/ui/button'
import { ADOPTION_PLANS } from '@/lib/payments/stripe'

export const metadata = { title: 'Aziende' }

export default function AziendePage() {
  return (
    <div className='mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6'>
      <PageHeader
        title='Adotta una zona di Torino'
        description='La tua azienda finanzia la cura di uno o più CAP e riceve un report d’impatto misurato.'
        actions={
          <Button asChild>
            <Link href='/login?next=/impatto'>Adotta una zona</Link>
          </Button>
        }
      />
      <div className='grid gap-4 md:grid-cols-2'>
        {Object.entries(ADOPTION_PLANS).map(([key, plan]) => (
          <SectionCard key={key} title={`Piano ${plan.label.toLowerCase()}`}>
            <p className='text-3xl font-semibold tabular-nums'>{plan.amount.toLocaleString('it-IT')} €</p>
            <p className='text-muted-foreground text-sm'>
              {plan.months} mesi, fino a 5 CAP, report d’impatto sempre aggiornato
            </p>
          </SectionCard>
        ))}
      </div>
      <div className='grid gap-4 lg:grid-cols-2'>
        <PannelloScheda occhiello='Cosa contiene il report'>
          <RigaDettaglio label='Segnalazioni'>
            Aperte, risolte e tempi di risoluzione nelle tue zone
          </RigaDettaglio>
          <RigaDettaglio label='Volontariato'>
            Missioni completate, ore e chili di rifiuti raccolti
          </RigaDettaglio>
          <RigaDettaglio label='Aria'>Medie delle misure dei POD e dei sensori a terra</RigaDettaglio>
          <RigaDettaglio label='Provenienza'>
            Per ogni numero: cittadini, POD o verifica del Comune
          </RigaDettaglio>
        </PannelloScheda>
        <PannelloScheda occhiello='Uso nel bilancio di sostenibilità'>
          <RigaDettaglio label='Standard'>
            VSME (EFRAG), informativa su pratiche e iniziative (B2/C2)
          </RigaDettaglio>
          <RigaDettaglio label='Cosa dichiara'>
            Il contributo dell’azienda alla cura del territorio
          </RigaDettaglio>
          <RigaDettaglio label='Cosa non dichiara'>
            Non riduce né compensa l’impronta ambientale dell’azienda
          </RigaDettaglio>
        </PannelloScheda>
      </div>
      <Avviso tono='info'>Il pagamento avviene con Stripe dopo l’accesso con l’account dell’azienda.</Avviso>
    </div>
  )
}
