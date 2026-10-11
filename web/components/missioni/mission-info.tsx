'use client'

import { Avviso } from '@/components/ds/avviso'
import { Data } from '@/components/ds/data'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { SectionCard } from '@/components/ds/section-card'
import { categoryName, REPORT_STATUS, type ReportStatus } from '@/lib/civic/categories'
import { numeroIt } from '@/lib/format-number'
import type { MissionDetail } from '@/lib/missioni/types'

/** Facts of a mission (side column) and its outcome (photos, hours, kg, notes). */
export function MissionFacts({ mission }: { mission: MissionDetail }) {
  return (
    <SectionCard>
      <PannelloScheda occhiello='Dettagli'>
        <RigaDettaglio label='CAP'>{mission.cap ?? '—'}</RigaDettaglio>
        <RigaDettaglio label='Categoria'>
          {mission.category ? categoryName(mission.category) : '—'}
        </RigaDettaglio>
        <RigaDettaglio label='Segnalazione'>
          {mission.reportStatus
            ? (REPORT_STATUS[mission.reportStatus as ReportStatus] ?? mission.reportStatus)
            : '—'}
        </RigaDettaglio>
        <RigaDettaglio label='Scadenza'>
          {mission.due_date ? <Data valore={mission.due_date} forma='corta' /> : '—'}
        </RigaDettaglio>
        <RigaDettaglio label='Volontario'>{mission.volunteer?.full_name ?? 'Nessuno'}</RigaDettaglio>
        <RigaDettaglio label='Inviata'>
          {mission.submitted_at ? <Data valore={mission.submitted_at} forma='corta' /> : '—'}
        </RigaDettaglio>
        <RigaDettaglio label='Verificata'>
          {mission.verified_at ? <Data valore={mission.verified_at} forma='corta' /> : '—'}
        </RigaDettaglio>
      </PannelloScheda>
    </SectionCard>
  )
}

export function MissionOutcome({ mission }: { mission: MissionDetail }) {
  const hasOutcome =
    mission.photo_before_url || mission.photo_after_url || mission.hours !== null || mission.volunteer_note
  return (
    <div className='space-y-6'>
      {mission.status === 'rejected' && mission.review_note && (
        <Avviso tono='destructive'>Respinta: {mission.review_note}</Avviso>
      )}
      {mission.description && (
        <SectionCard title='Descrizione'>
          <p className='text-sm whitespace-pre-line'>{mission.description}</p>
        </SectionCard>
      )}
      {hasOutcome && (
        <SectionCard title='Esito'>
          <div className='space-y-4'>
            {(mission.photo_before_url || mission.photo_after_url) && (
              <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                <Photo url={mission.photo_before_url} label='Prima' />
                <Photo url={mission.photo_after_url} label='Dopo' />
              </div>
            )}
            <PannelloScheda occhiello='Attività'>
              <RigaDettaglio label='Ore'>
                {mission.hours !== null ? `${numeroIt(Number(mission.hours))} h` : '—'}
              </RigaDettaglio>
              <RigaDettaglio label='Kg raccolti'>
                {mission.kg_collected !== null ? `${numeroIt(Number(mission.kg_collected))} kg` : '—'}
              </RigaDettaglio>
              <RigaDettaglio label='Nota'>{mission.volunteer_note ?? '—'}</RigaDettaglio>
            </PannelloScheda>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function Photo({ url, label }: { url: string | null; label: string }) {
  return (
    <figure className='space-y-1'>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Foto ${label.toLowerCase()}`}
          className='aspect-video w-full rounded-md object-cover'
        />
      ) : (
        <div className='bg-muted text-muted-foreground flex aspect-video w-full items-center justify-center rounded-md text-sm'>
          Nessuna foto
        </div>
      )}
      <figcaption className='text-muted-foreground text-xs'>{label}</figcaption>
    </figure>
  )
}
