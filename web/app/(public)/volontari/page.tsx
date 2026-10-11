import Link from 'next/link'

import { Avviso } from '@/components/ds/avviso'
import PageHeader from '@/components/ds/page-header'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { Button } from '@/components/ui/button'
import { PARTNER_ETS } from '@/lib/payments/stripe'

export const metadata = { title: 'Volontari' }

export default function VolontariPage() {
  return (
    <div className='mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6'>
      <PageHeader
        title='Diventa volontario della tua zona'
        description='Prendi una missione su una segnalazione vera, risolvila e documentala con due foto.'
        actions={
          <Button asChild>
            <Link href='/login?next=/missioni'>Registrati</Link>
          </Button>
        }
      />
      <div className='grid gap-4 lg:grid-cols-2'>
        <PannelloScheda occhiello='Come funziona'>
          <RigaDettaglio label='1. Iscrizione'>{`Ti iscrivi a ${PARTNER_ETS}, che ti assicura`}</RigaDettaglio>
          <RigaDettaglio label='2. Missione'>
            Scegli una missione vicino a te e la prendi in carico
          </RigaDettaglio>
          <RigaDettaglio label='3. Prova'>Foto prima e dopo, ore impiegate e chili raccolti</RigaDettaglio>
          <RigaDettaglio label='4. Verifica'>
            Un operatore del Comune conferma e la segnalazione si chiude
          </RigaDettaglio>
        </PannelloScheda>
        <PannelloScheda occhiello='Rimborsi, non compensi'>
          <RigaDettaglio label='Base legale'>
            Volontariato in un ETS (art. 17 CTS) e patto di collaborazione col Comune
          </RigaDettaglio>
          <RigaDettaglio label='Spese autocertificate'>Fino a 10 € al giorno e 150 € al mese</RigaDettaglio>
          <RigaDettaglio label='Spese con ricevuta'>Rimborsate per l’importo documentato</RigaDettaglio>
          <RigaDettaglio label='Chi paga'>{`${PARTNER_ETS}, con il fondo delle donazioni`}</RigaDettaglio>
        </PannelloScheda>
      </div>
      <Avviso tono='info'>
        Le ore servono a documentare l’attività, non a calcolare un compenso: il volontariato non è
        retribuito.
      </Avviso>
    </div>
  )
}
