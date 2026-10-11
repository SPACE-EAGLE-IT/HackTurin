'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { Interruttore } from '@/components/ds/interruttore'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { SectionCard } from '@/components/ds/section-card'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { enrolVolunteer } from '@/lib/missioni/actions'
import { DAILY_CAP, MONTHLY_CAP } from '@/lib/missioni/types'

/** One-step enrolment: joining the partner ETS as a volunteer brings its insurance (CTS art. 18). */
export function EnrolmentCard({ ets }: { ets: string }) {
  const router = useRouter()
  const [accepted, setAccepted] = useState(false)
  const [pending, startTransition] = useTransition()

  const save = () =>
    startTransition(async () => {
      const result = await enrolVolunteer({ member: true, insured: true })
      if (!result.ok) return void toast.error(result.message)
      toast.success(`Benvenuto in ${ets}`)
      router.refresh()
    })

  return (
    <SectionCard
      title={`Diventa volontario con ${ets}`}
      info='Le missioni si svolgono nel patto di collaborazione tra il Comune di Torino e l’associazione.'
    >
      <div className='grid gap-4 lg:grid-cols-2'>
        <PannelloScheda occhiello='Cosa ricevi'>
          <RigaDettaglio label='Assicurazione'>
            Infortuni e responsabilità civile, pagata dall’associazione
          </RigaDettaglio>
          <RigaDettaglio label='Attestato'>
            Ore verificate dal Comune, valide per CV, PCTO e crediti
          </RigaDettaglio>
          <RigaDettaglio label='Rimborsi'>{`Spese vere: fino a ${DAILY_CAP} € al giorno e ${MONTHLY_CAP} € al mese senza ricevuta`}</RigaDettaglio>
          <RigaDettaglio label='Materiali'>Guanti, sacchi e pinze dal kit dell’associazione</RigaDettaglio>
        </PannelloScheda>
        <div className='flex flex-col justify-between gap-4'>
          <Interruttore
            etichetta={`Aderisco come socio volontario di ${ets}`}
            descrizione='Gratuito. Il volontariato non è retribuito: si rimborsano solo le spese sostenute.'
            acceso={accepted}
            onAcceso={setAccepted}
          />
          <div className='flex justify-end'>
            <Button onClick={save} disabled={!accepted || pending}>
              {pending && <Spinner />} Diventa volontario
            </Button>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
