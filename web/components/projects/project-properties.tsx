'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Data } from '@/components/ds/data'
import { EmptyState } from '@/components/ds/empty-state'
import { DateTrigger } from '@/components/ds/field-trigger'
import { NumberField } from '@/components/ds/number-field'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { Scelta } from '@/components/ds/scelta'
import { SectionCard } from '@/components/ds/section-card'
import { ValoreLetto } from '@/components/ds/valore-letto'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CAPS } from '@/lib/civic/cap'
import { numeroIt } from '@/lib/format-number'
import { updateProject } from '@/lib/projects/actions'
import {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABEL,
  type ProjectDetail,
  type ProjectStatus,
} from '@/lib/projects/types'
import type { PersonRef } from '@/lib/tasks/types'

type ProjectPatch = Partial<{
  status: ProjectStatus
  ownerId: string | null
  dueDate: string | null
  budgetHours: number | null
  clientName: string | null
  notes: string | null
  caps: string[]
}>

const STATUS_OPTIONS = PROJECT_STATUSES.map(status => ({
  value: status,
  label: PROJECT_STATUS_LABEL[status],
}))

export function ProjectProperties({
  project,
  people,
  canWrite,
}: {
  project: ProjectDetail
  people: PersonRef[]
  canWrite: boolean
}) {
  const [, startTransition] = useTransition()
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [ownerId, setOwnerId] = useState<string | null>(project.owner?.id ?? null)
  const [dueDate, setDueDate] = useState<string | undefined>(project.due_date ?? undefined)
  const [budgetHours, setBudgetHours] = useState<number | null>(project.budget_hours)
  const [clientName, setClientName] = useState(project.client_name ?? '')
  const [notes, setNotes] = useState(project.notes ?? '')

  const peopleOptions = people.map(person => ({ value: person.id, label: person.full_name }))

  function save(patch: ProjectPatch, revert?: () => void) {
    startTransition(async () => {
      const result = await updateProject(project.id, patch)
      if (result.ok) return
      toast.error(result.message)
      revert?.()
    })
  }

  function changeStatus(value: string) {
    const next = PROJECT_STATUSES.find(candidate => candidate === value)
    if (!next || next === status) return
    const previous = status
    setStatus(next)
    save({ status: next }, () => setStatus(previous))
  }

  const [caps, setCaps] = useState<string[]>(project.caps)
  function changeCaps(value: string[]) {
    const previous = caps
    setCaps(value)
    save({ caps: value }, () => setCaps(previous))
  }

  function changeOwner(value: string | null) {
    if (value === ownerId) return
    const previous = ownerId
    setOwnerId(value)
    save({ ownerId: value }, () => setOwnerId(previous))
  }

  function changeDueDate(value?: string) {
    if ((value ?? null) === (dueDate ?? null)) return
    const previous = dueDate
    setDueDate(value)
    save({ dueDate: value ?? null }, () => setDueDate(previous))
  }

  function changeBudget(value: number | null) {
    if (value === budgetHours) return
    const previous = budgetHours
    setBudgetHours(value)
    save({ budgetHours: value }, () => setBudgetHours(previous))
  }

  function commitClient() {
    const next = clientName.trim() || null
    if (next === (project.client_name ?? null)) return
    save({ clientName: next }, () => setClientName(project.client_name ?? ''))
  }

  function commitNotes() {
    const next = notes.trim() || null
    if (next === (project.notes ?? null)) return
    save({ notes: next }, () => setNotes(project.notes ?? ''))
  }

  const budgetLabel = project.budget_hours == null ? null : `${numeroIt(project.budget_hours)} h`

  return (
    <div className='space-y-6'>
      <PannelloScheda occhiello='Proprietà'>
        <RigaDettaglio label='Stato'>
          {canWrite ? (
            <Scelta opzioni={STATUS_OPTIONS} value={status} onValueChange={changeStatus} />
          ) : (
            <ValoreLetto valore={PROJECT_STATUS_LABEL[project.status]} />
          )}
        </RigaDettaglio>
        <RigaDettaglio label='Responsabile'>
          {canWrite ? (
            <Scelta
              opzioni={peopleOptions}
              value={ownerId}
              onValueChange={changeOwner}
              azzera='Nessuno'
              cerca='Cerca persona'
              placeholder='Nessuno'
            />
          ) : (
            <ValoreLetto valore={project.owner?.full_name ?? null} />
          )}
        </RigaDettaglio>
        <RigaDettaglio label='Scadenza'>
          {canWrite ? (
            <DateTrigger value={dueDate} onChange={changeDueDate} placeholder='Nessuna scadenza' />
          ) : (
            <ValoreLetto
              valore={project.due_date ? <Data valore={project.due_date} forma='corta' /> : null}
            />
          )}
        </RigaDettaglio>
        <RigaDettaglio label='Budget ore'>
          {canWrite ? (
            <NumberField value={budgetHours} onValueChange={changeBudget} decimals={0} unit='h' />
          ) : (
            <ValoreLetto valore={budgetLabel} />
          )}
        </RigaDettaglio>
        <RigaDettaglio label='CAP coperti'>
          {canWrite ? (
            <Scelta
              multipla
              opzioni={CAPS.map(cap => ({ value: cap, label: cap }))}
              value={caps}
              onValueChange={changeCaps}
              cerca='Cerca CAP'
              placeholder='Nessun CAP'
            />
          ) : (
            <ValoreLetto valore={project.caps.length ? project.caps.join(', ') : null} />
          )}
        </RigaDettaglio>
        <RigaDettaglio label='Gestore'>
          {canWrite ? (
            <Input
              value={clientName}
              onChange={event => setClientName(event.target.value)}
              onBlur={commitClient}
              placeholder='Nessun gestore'
              maxLength={160}
            />
          ) : (
            <ValoreLetto valore={project.client_name} />
          )}
        </RigaDettaglio>
      </PannelloScheda>

      <SectionCard title='Note'>
        {canWrite ? (
          <Textarea
            value={notes}
            onChange={event => setNotes(event.target.value)}
            onBlur={commitNotes}
            rows={6}
            maxLength={4000}
            placeholder='Aggiungi una nota'
          />
        ) : project.notes ? (
          <p className='text-sm whitespace-pre-wrap'>{project.notes}</p>
        ) : (
          <EmptyState compatto testo='Nessuna nota' />
        )}
      </SectionCard>
    </div>
  )
}
