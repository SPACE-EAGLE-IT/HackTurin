import Link from 'next/link'

import { Avviso } from '@/components/ds/avviso'
import PageHeader from '@/components/ds/page-header'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { SectionCard } from '@/components/ds/section-card'
import { Button } from '@/components/ui/button'
import { ADOPTION_PLANS, PARTNER_ETS } from '@/lib/payments/stripe'

export const metadata = { title: 'Aziende' }

export default function AziendePage() {
  return (
    <div className='mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6'>
      <PageHeader
        title='La tua azienda per Torino'
        description='Porta il tuo team a curare un quartiere o adotta una zona: ricevi un report d’impatto misurato.'
        actions={
          <Button asChild>
            <Link href='/login?next=/impatto'>Scegli un piano</Link>
          </Button>
        }
      />
      <div className='grid gap-4 md:grid-cols-3'>
        {Object.entries(ADOPTION_PLANS).map(([key, plan]) => (
          <SectionCard key={key} title={plan.label}>
            <p className='text-3xl font-semibold tabular-nums'>{plan.amount.toLocaleString('it-IT')} €</p>
            <p className='text-muted-foreground text-sm'>{plan.pitch}</p>
          </SectionCard>
        ))}
      </div>
      <div className='grid gap-4 lg:grid-cols-2'>
        <PannelloScheda occhiello='La giornata di volontariato'>
          <RigaDettaglio label='Dove'>Una zona con segnalazioni aperte, scelta con voi</RigaDettaglio>
          <RigaDettaglio label='Chi organizza'>{`${PARTNER_ETS}: coordinatore, assicurazione, kit`}</RigaDettaglio>
          <RigaDettaglio label='Risultato'>Segnalazioni chiuse e verificate dal Comune</RigaDettaglio>
          <RigaDettaglio label='Per le persone'>
            Team building utile, attestato per ogni partecipante
          </RigaDettaglio>
        </PannelloScheda>
        <PannelloScheda occhiello='Cosa contiene il report'>
          <RigaDettaglio label='Segnalazioni'>
            Aperte, risolte e tempi di risoluzione nelle tue zone
          </RigaDettaglio>
          <RigaDettaglio label='Volontariato'>Giornate del team, ore-persona e chili raccolti</RigaDettaglio>
          <RigaDettaglio label='Aria'>Medie delle misure dei POD nelle zone adottate</RigaDettaglio>
          <RigaDettaglio label='Provenienza'>
            Per ogni numero: cittadini, POD o verifica del Comune
          </RigaDettaglio>
        </PannelloScheda>
        <PannelloScheda occhiello='Uso nel bilancio di sostenibilità'>
          <RigaDettaglio label='Standard'>
            VSME (EFRAG): pratiche verso la comunità e il personale
          </RigaDettaglio>
          <RigaDettaglio label='Cosa dichiara'>
            Il contributo dell’azienda alla cura del territorio
          </RigaDettaglio>
          <RigaDettaglio label='Cosa non dichiara'>
            Non riduce né compensa l’impronta ambientale
          </RigaDettaglio>
        </PannelloScheda>
        <PannelloScheda occhiello='Dove vanno i soldi'>
          <RigaDettaglio label='Beneficiario'>{PARTNER_ETS}</RigaDettaglio>
          <RigaDettaglio label='Copre'>
            Coordinamento, assicurazioni, materiali, rimborsi ai volontari
          </RigaDettaglio>
          <RigaDettaglio label='Trasparenza'>Fondo e rimborsi pubblicati nella pagina Dona</RigaDettaglio>
        </PannelloScheda>
      </div>
      <Avviso tono='info'>Il pagamento avviene con Stripe dopo l’accesso con l’account dell’azienda.</Avviso>
    </div>
  )
}
