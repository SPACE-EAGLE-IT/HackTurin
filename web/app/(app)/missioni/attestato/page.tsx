import { BackLink } from '@/components/ds/back-link'
import PageHeader from '@/components/ds/page-header'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { SectionCard } from '@/components/ds/section-card'
import { PrintButton } from '@/components/impatto/report-controls'
import { requirePageAccess } from '@/lib/access/guard'
import { requireSession } from '@/lib/auth/session'
import { formatDateIt } from '@/lib/format-date'
import { numeroIt } from '@/lib/format-number'
import { listCertificate } from '@/lib/missioni/queries'
import { volunteerLevel } from '@/lib/missioni/types'
import { PARTNER_ETS } from '@/lib/payments/stripe'

export const metadata = { title: 'Attestato ore' }

/** Printable certificate of the volunteer's verified hours: recognition instead of pay. */
export default async function AttestatoPage() {
  await requirePageAccess('missioni')
  const session = await requireSession()
  const rows = await listCertificate(session.profile.id)
  const hours = Math.round(rows.reduce((sum, row) => sum + row.hours, 0) * 10) / 10
  const level = volunteerLevel(hours)
  const first = rows[0]?.verified_at
  const last = rows.at(-1)?.verified_at

  return (
    <div className='mx-auto w-full max-w-3xl space-y-6'>
      <div className='print:hidden'>
        <BackLink href='/missioni'>Missioni</BackLink>
      </div>
      <PageHeader
        title='Attestato di volontariato'
        description={`Rilasciato da ${PARTNER_ETS} sulle missioni verificate dal Comune di Torino.`}
        actions={<PrintButton />}
      />
      <SectionCard>
        <div className='space-y-4 text-sm leading-relaxed'>
          <p>
            {`${PARTNER_ETS}, ente del Terzo settore, attesta che `}
            <span className='font-semibold'>{session.profile.full_name}</span>
            {rows.length === 0
              ? ' non ha ancora missioni verificate.'
              : ` ha svolto attività di volontariato per la cura dei beni comuni della città di Torino, per un totale di ${numeroIt(hours)} ore in ${rows.length} ${rows.length === 1 ? 'missione verificata' : 'missioni verificate'}${first && last ? `, dal ${formatDateIt(first.slice(0, 10))} al ${formatDateIt(last.slice(0, 10))}` : ''}.`}
          </p>
          <p className='text-muted-foreground'>
            L’attività è stata prestata in modo personale, spontaneo e gratuito (art. 17 D.Lgs. 117/2017),
            nell’ambito del patto di collaborazione con il Comune di Torino. Ogni missione è documentata con
            foto prima e dopo e verificata da un operatore comunale.
          </p>
          <p>
            Livello raggiunto: <span className='font-semibold'>{level.label}</span>
          </p>
        </div>
      </SectionCard>
      {rows.length > 0 && (
        <PannelloScheda occhiello='Missioni verificate'>
          {rows.map(row => (
            <RigaDettaglio key={row.id} label={formatDateIt(row.verified_at.slice(0, 10))}>
              {`${row.title}${row.cap ? ` · CAP ${row.cap}` : ''} · ${numeroIt(row.hours)} h`}
            </RigaDettaglio>
          ))}
        </PannelloScheda>
      )}
    </div>
  )
}
