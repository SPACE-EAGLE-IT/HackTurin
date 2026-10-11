'use client'

import { HandHeartIcon, RotateCcwIcon, XCircleIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ds/confirm-dialog'
import { DialogoAzione } from '@/components/ds/dialogo-azione'
import { DateTrigger, PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { MenuAzioni } from '@/components/ds/menu-azioni'
import { Scelta } from '@/components/ds/scelta'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { categoryName } from '@/lib/civic/categories'
import { eseguiConEsito } from '@/lib/esegui-con-esito'
import { createIntervention, publishMission, setReportStatus } from '@/lib/segnalazioni/actions'
import type { ReportDetail } from '@/lib/segnalazioni/types'
import type { PersonRef } from '@/lib/tasks/types'

/** Header actions of a report: the intervention is the primary, missions and status changes are secondary. */
export function ReportActions({
  report,
  people,
  canIntervene,
  canPublishMission,
  canEdit,
}: {
  report: ReportDetail
  people: PersonRef[]
  canIntervene: boolean
  canPublishMission: boolean
  canEdit: boolean
}) {
  const router = useRouter()
  const [dialog, setDialog] = useState<'intervento' | 'missione' | 'respingi' | null>(null)
  const [pending, startTransition] = useTransition()
  const defaultTitle = `${categoryName(report.category)} · CAP ${report.cap}`
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState(report.description ?? '')
  const [assigneeId, setAssigneeId] = useState<string | null>(null)
  const [dueDate, setDueDate] = useState<string | undefined>()

  const open = (kind: 'intervento' | 'missione') => {
    setTitle(kind === 'missione' ? `Ripulisci: ${defaultTitle}` : defaultTitle)
    setDialog(kind)
  }

  const submit = () =>
    startTransition(() =>
      eseguiConEsito(
        dialog === 'missione'
          ? publishMission({ reportId: report.id, title, description, dueDate: dueDate ?? null })
          : createIntervention({
              reportId: report.id,
              title,
              description,
              assigneeId,
              dueDate: dueDate ?? null,
            }),
        r => {
          if (!r.ok) return void toast.error(r.message)
          toast.success(dialog === 'missione' ? 'Missione pubblicata' : 'Intervento creato')
          setDialog(null)
          router.push(dialog === 'missione' ? `/missioni/${r.data.id}` : `/tasks/${r.data.id}`)
        }
      )
    )

  const setStatus = (status: 'open' | 'rejected' | 'resolved') =>
    startTransition(() =>
      eseguiConEsito(setReportStatus({ id: report.id, status }), r => {
        if (!r.ok) return void toast.error(r.message)
        toast.success('Stato aggiornato')
        setDialog(null)
        router.refresh()
      })
    )

  const closed = report.status === 'resolved' || report.status === 'rejected'

  return (
    <>
      {canEdit && (
        <MenuAzioni etichetta='Altre azioni'>
          {closed ? (
            <DropdownMenuItem onSelect={() => setStatus('open')}>
              <RotateCcwIcon /> Riapri
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setDialog('respingi')}>
              <XCircleIcon /> Respingi
            </DropdownMenuItem>
          )}
        </MenuAzioni>
      )}
      {canPublishMission && !closed && (
        <Button variant='outline' onClick={() => open('missione')}>
          <HandHeartIcon /> Pubblica come missione
        </Button>
      )}
      {canIntervene && !closed && <Button onClick={() => open('intervento')}>Crea intervento</Button>}

      <DialogoAzione
        open={dialog === 'intervento' || dialog === 'missione'}
        onOpenChange={o => !o && setDialog(null)}
        titolo={dialog === 'missione' ? 'Pubblica missione' : 'Nuovo intervento'}
        natura='creazione'
        azione={{
          etichetta: dialog === 'missione' ? 'Pubblica missione' : 'Crea intervento',
          onClick: submit,
          attesa: pending,
        }}
      >
        <FormGrid>
          <PropertyField label='Titolo' span>
            <Input value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </PropertyField>
          {dialog === 'intervento' && (
            <PropertyField label='Squadra o persona'>
              <Scelta
                opzioni={people.map(p => ({ value: p.id, label: p.full_name }))}
                value={assigneeId}
                onValueChange={setAssigneeId}
                azzera='Nessuna'
                cerca='Cerca persona'
              />
            </PropertyField>
          )}
          <PropertyField label='Scadenza'>
            <DateTrigger value={dueDate} onChange={setDueDate} placeholder='Scegli una data' />
          </PropertyField>
          <PropertyField label='Descrizione' span>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} />
          </PropertyField>
        </FormGrid>
      </DialogoAzione>

      <ConfirmDialog
        open={dialog === 'respingi'}
        title='Respingere la segnalazione?'
        description='Sparisce dalla mappa pubblica. Puoi riaprirla in qualsiasi momento.'
        confirmLabel='Respingi'
        tone='destructive'
        onConfirm={() => setStatus('rejected')}
        onClose={() => setDialog(null)}
      />
    </>
  )
}
