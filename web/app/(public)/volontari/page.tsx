import Link from 'next/link'

import { Avviso } from '@/components/ds/avviso'
import PageHeader from '@/components/ds/page-header'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { Button } from '@/components/ui/button'
import { DAILY_CAP, MONTHLY_CAP, VOLUNTEER_LEVELS } from '@/lib/missioni/types'
import { PARTNER_ETS } from '@/lib/payments/stripe'

export const metadata = { title: 'Volontari' }

export default function VolontariPage() {
  return (
    <div className='mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6'>
      <PageHeader
        title='Cura la tua zona, con chi vuoi'
        description={`Missioni su segnalazioni vere, da solo o con i colleghi. Coordina ${PARTNER_ETS}, verifica il Comune.`}
        actions={
          <Button asChild>
            <Link href='/login?next=/missioni'>Diventa volontario</Link>
          </Button>
        }
      />
      <div className='grid gap-4 lg:grid-cols-2'>
        <PannelloScheda occhiello='Da cittadino'>
          <RigaDettaglio label='1. Aderisci'>{`Ti registri e diventi socio volontario di ${PARTNER_ETS}, gratis e assicurato`}</RigaDettaglio>
          <RigaDettaglio label='2. Scegli'>
            Una missione vicino a te: rifiuti, graffiti, piccole cure
          </RigaDettaglio>
          <RigaDettaglio label='3. Documenta'>Foto prima e dopo, ore e chili raccolti</RigaDettaglio>
          <RigaDettaglio label='4. Ottieni'>Ore verificate dal Comune nel tuo attestato</RigaDettaglio>
        </PannelloScheda>
        <PannelloScheda occhiello='Con la tua azienda'>
          <RigaDettaglio label='Giornata di team'>
            Un gruppo fino a 15 colleghi su una zona della città
          </RigaDettaglio>
          <RigaDettaglio label='Tutto incluso'>Coordinatore, assicurazione, kit e materiali</RigaDettaglio>
          <RigaDettaglio label='Per il bilancio'>Ore-persona e risultati nel report d’impatto</RigaDettaglio>
          <RigaDettaglio label='Come'>
            <Link href='/aziende' className='text-primary underline-offset-4 hover:underline'>
              Vedi i piani per le aziende
            </Link>
          </RigaDettaglio>
        </PannelloScheda>
        <PannelloScheda occhiello='Cosa ricevi, senza compensi'>
          <RigaDettaglio label='Attestato'>
            Ore valide per CV, PCTO e crediti formativi dove riconosciuti
          </RigaDettaglio>
          <RigaDettaglio label='Livelli'>{VOLUNTEER_LEVELS.map(l => l.label).join(' → ')}</RigaDettaglio>
          <RigaDettaglio label='Rimborsi'>{`Solo spese vere: fino a ${DAILY_CAP} € al giorno e ${MONTHLY_CAP} € al mese senza ricevuta`}</RigaDettaglio>
          <RigaDettaglio label='Assicurazione'>
            Infortuni e responsabilità civile a carico dell’associazione
          </RigaDettaglio>
        </PannelloScheda>
        <PannelloScheda occhiello='Chi paga cosa'>
          <RigaDettaglio label='Aziende'>
            Le giornate di team e le adozioni finanziano il programma
          </RigaDettaglio>
          <RigaDettaglio label='Donazioni'>{`A ${PARTNER_ETS}: materiali e rimborsi, deducibili`}</RigaDettaglio>
          <RigaDettaglio label='Comune'>Patto di collaborazione e verifica degli interventi</RigaDettaglio>
          <RigaDettaglio label='Base legale'>
            Art. 17–18 Codice del Terzo settore, Regolamento beni comuni n. 391
          </RigaDettaglio>
        </PannelloScheda>
      </div>
      <Avviso tono='info'>
        Il volontariato non è retribuito: le ore servono a riconoscere l’impegno, non a calcolare un compenso.
      </Avviso>
    </div>
  )
}
