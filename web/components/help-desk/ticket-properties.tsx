'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ListTodoIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Data } from '@/components/ds/data'
import { EmptyState } from '@/components/ds/empty-state'
import { DateTrigger } from '@/components/ds/field-trigger'
import { PannelloScheda, RigaDettaglio, RigaRimando } from '@/components/ds/pannello-scheda'
import { Scelta } from '@/components/ds/scelta'
import { ValoreLetto } from '@/components/ds/valore-letto'
import { TicketPriorityBadge, TicketStatusBadge } from '@/components/help-desk/ticket-badges'
import { Person } from '@/components/people/person-ref'
import { TaskStatusBadge } from '@/components/tasks/task-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { createTaskFromTicket, updateTicket } from '@/lib/help-desk/actions'
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUSES,
  TICKET_STATUS_LABEL,
  requesterLabel,
  type TicketCategory,
  type TicketDetail,
  type TicketPriority,
  type TicketStatus,
} from '@/lib/help-desk/types'
import type { PersonRef, ProjectRef } from '@/lib/tasks/types'

/** The fields a property control may send to `updateTicket`. */
type TicketPatch = {
  status?: TicketStatus
  priority?: TicketPriority
  categoryId?: string | null
  assigneeId?: string | null
  requesterId?: string | null
  requesterName?: string | null
  requesterEmail?: string | null
  projectId?: string | null
  dueDate?: string | null
}

/** What the panel shows; kept locally so a change is visible before the server answers. */
type Fields = Pick<
  TicketDetail,
  | 'status'
  | 'priority'
  | 'category_id'
  | 'assignee_id'
  | 'requester_id'
  | 'requester_name'
  | 'requester_email'
  | 'project_id'
  | 'due_at'
>

const STATUS_OPTIONS = TICKET_STATUSES.map(status => ({ value: status, label: TICKET_STATUS_LABEL[status] }))
const PRIORITY_OPTIONS = TICKET_PRIORITIES.map(priority => ({
  value: priority,
  label: TICKET_PRIORITY_LABEL[priority],
}))

function fieldsOf(ticket: TicketDetail): Fields {
  return {
    status: ticket.status,
    priority: ticket.priority,
    category_id: ticket.category_id,
    assignee_id: ticket.assignee_id,
    requester_id: ticket.requester_id,
    requester_name: ticket.requester_name,
    requester_email: ticket.requester_email,
    project_id: ticket.project_id,
    due_at: ticket.due_at,
  }
}

function oneOf<T extends string>(list: readonly T[], value: string): T | undefined {
  return list.find(candidate => candidate === value)
}

/** The `YYYY-MM-DD` of a deadline stored as noon UTC of that day. */
function dateKeyOf(dueAt: string | null) {
  return dueAt ? dueAt.slice(0, 10) : undefined
}

export function TicketProperties({
  ticket,
  categories,
  people,
  projects,
  canWrite,
}: {
  ticket: TicketDetail
  categories: TicketCategory[]
  people: PersonRef[]
  projects: ProjectRef[]
  canWrite: boolean
}) {
  return (
    <div className='space-y-6'>
      {canWrite ? (
        <EditablePanel ticket={ticket} categories={categories} people={people} projects={projects} />
      ) : (
        <ReadOnlyPanel ticket={ticket} />
      )}
      <LinkedTaskPanel ticket={ticket} canWrite={canWrite} />
      <DatesPanel ticket={ticket} />
    </div>
  )
}

function ReadOnlyPanel({ ticket }: { ticket: TicketDetail }) {
  const projectLabel = ticket.project ? `${ticket.project.code} · ${ticket.project.name}` : null
  return (
    <PannelloScheda occhiello='Proprietà'>
      <RigaDettaglio label='Stato'>
        <TicketStatusBadge status={ticket.status} />
      </RigaDettaglio>
      <RigaDettaglio label='Priorità'>
        <TicketPriorityBadge priority={ticket.priority} />
      </RigaDettaglio>
      <RigaDettaglio label='Categoria'>
        <ValoreLetto valore={ticket.category?.name ?? null} />
      </RigaDettaglio>
      <RigaDettaglio label='Assegnato a'>
        <Person person={ticket.assignee} size='xs' emptyLabel='Nessuno' />
      </RigaDettaglio>
      <RigaDettaglio label='Richiedente'>
        {ticket.requester ? (
          <Person person={ticket.requester} size='xs' />
        ) : (
          <div className='min-w-0'>
            <ValoreLetto valore={requesterLabel(ticket)} />
            {ticket.requester_email && (
              <div className='text-muted-foreground truncate text-xs font-normal'>
                {ticket.requester_email}
              </div>
            )}
          </div>
        )}
      </RigaDettaglio>
      <RigaDettaglio label='Commessa'>
        <ValoreLetto valore={projectLabel} />
      </RigaDettaglio>
      <RigaDettaglio label='Scadenza'>
        <ValoreLetto valore={ticket.due_at ? <Data valore={ticket.due_at} forma='intera' /> : null} />
      </RigaDettaglio>
    </PannelloScheda>
  )
}

function EditablePanel({
  ticket,
  categories,
  people,
  projects,
}: {
  ticket: TicketDetail
  categories: TicketCategory[]
  people: PersonRef[]
  projects: ProjectRef[]
}) {
  const [pending, startTransition] = useTransition()
  const [fields, setFields] = useState<Fields>(() => fieldsOf(ticket))
  const [nameDraft, setNameDraft] = useState(ticket.requester_name ?? '')
  const [emailDraft, setEmailDraft] = useState(ticket.requester_email ?? '')
  const [lastTicket, setLastTicket] = useState(ticket)
  // The server sent a new ticket (own save or someone else's): the panel follows it.
  if (ticket !== lastTicket) {
    setLastTicket(ticket)
    setFields(fieldsOf(ticket))
    setNameDraft(ticket.requester_name ?? '')
    setEmailDraft(ticket.requester_email ?? '')
  }

  const save = (patch: TicketPatch, next: Partial<Fields>) => {
    const keys = Object.keys(next) as (keyof Fields)[]
    const before = Object.fromEntries(keys.map(key => [key, fields[key]])) as Partial<Fields>
    setFields(current => ({ ...current, ...next }))
    startTransition(async () => {
      const result = await updateTicket(ticket.id, patch)
      if (result.ok) return
      toast.error(Object.values(result.fieldErrors ?? {})[0] ?? result.message)
      setFields(current => ({ ...current, ...before }))
    })
  }

  // Active categories, plus the current one even when it has been switched off since.
  const categoryOptions = categories
    .filter(category => category.is_active || category.id === fields.category_id)
    .map(category => ({ value: category.id, label: category.name }))
  const peopleOptions = people.map(person => ({ value: person.id, label: person.full_name }))
  const projectOptions = projects.map(project => ({
    value: project.id,
    label: `${project.code} · ${project.name}`,
  }))
  const external = fields.requester_id === null

  const commitName = () => {
    const name = nameDraft.trim() || null
    if (name !== fields.requester_name) save({ requesterName: name }, { requester_name: name })
  }
  const commitEmail = () => {
    const email = emailDraft.trim() || null
    if (email !== fields.requester_email) save({ requesterEmail: email }, { requester_email: email })
  }

  return (
    <PannelloScheda occhiello='Proprietà'>
      <RigaDettaglio label='Stato'>
        <Scelta
          opzioni={STATUS_OPTIONS}
          value={fields.status}
          onValueChange={value => {
            const status = oneOf(TICKET_STATUSES, value)
            if (status && status !== fields.status) save({ status }, { status })
          }}
          disabled={pending}
        />
      </RigaDettaglio>
      <RigaDettaglio label='Priorità'>
        <Scelta
          opzioni={PRIORITY_OPTIONS}
          value={fields.priority}
          onValueChange={value => {
            const priority = oneOf(TICKET_PRIORITIES, value)
            if (priority && priority !== fields.priority) save({ priority }, { priority })
          }}
          disabled={pending}
        />
      </RigaDettaglio>
      <RigaDettaglio label='Categoria'>
        <Scelta
          opzioni={categoryOptions}
          value={fields.category_id}
          onValueChange={value => save({ categoryId: value }, { category_id: value })}
          azzera='Nessuna'
          placeholder='Nessuna'
          disabled={pending}
        />
      </RigaDettaglio>
      <RigaDettaglio label='Assegnato a'>
        <Scelta
          opzioni={peopleOptions}
          value={fields.assignee_id}
          onValueChange={value => save({ assigneeId: value }, { assignee_id: value })}
          azzera='Nessuno'
          cerca='Cerca persona'
          placeholder='Nessuno'
          disabled={pending}
        />
      </RigaDettaglio>
      <RigaDettaglio label='Richiedente'>
        <div className='space-y-2'>
          <Scelta
            opzioni={peopleOptions}
            value={fields.requester_id}
            onValueChange={value => save({ requesterId: value }, { requester_id: value })}
            azzera='Persona esterna'
            cerca='Cerca persona'
            placeholder='Persona esterna'
            disabled={pending}
          />
          {external && (
            <>
              <Input
                value={nameDraft}
                onChange={event => setNameDraft(event.target.value)}
                onBlur={commitName}
                maxLength={120}
                placeholder='Nome'
                aria-label='Nome del richiedente'
              />
              <Input
                type='email'
                value={emailDraft}
                onChange={event => setEmailDraft(event.target.value)}
                onBlur={commitEmail}
                autoComplete='off'
                placeholder='E-mail'
                aria-label='E-mail del richiedente'
              />
            </>
          )}
        </div>
      </RigaDettaglio>
      <RigaDettaglio label='Commessa'>
        <Scelta
          opzioni={projectOptions}
          value={fields.project_id}
          onValueChange={value => save({ projectId: value }, { project_id: value })}
          azzera='Nessuna'
          cerca='Cerca commessa'
          placeholder='Nessuna'
          disabled={pending}
        />
      </RigaDettaglio>
      <RigaDettaglio label='Scadenza'>
        <DateTrigger
          value={dateKeyOf(fields.due_at)}
          onChange={value =>
            save({ dueDate: value ?? null }, { due_at: value ? `${value}T12:00:00Z` : null })
          }
          placeholder='Nessuna'
        />
      </RigaDettaglio>
    </PannelloScheda>
  )
}

function LinkedTaskPanel({ ticket, canWrite }: { ticket: TicketDetail; canWrite: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const createTask = () =>
    startTransition(async () => {
      const result = await createTaskFromTicket(ticket.id)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success('Task creata')
      router.refresh()
    })

  return (
    <PannelloScheda occhiello='Task collegata'>
      {ticket.task ? (
        <RigaRimando
          href={`/tasks/${ticket.task.id}`}
          sopra={<TaskStatusBadge status={ticket.task.status} size='sm' />}
          titolo={ticket.task.title}
        />
      ) : (
        <div className='space-y-3'>
          <EmptyState compatto testo='Nessuna task' />
          {canWrite && (
            <Button variant='outline' size='sm' onClick={createTask} disabled={pending}>
              {pending ? <Spinner /> : <ListTodoIcon />} Crea task dal ticket
            </Button>
          )}
        </div>
      )}
    </PannelloScheda>
  )
}

function DatesPanel({ ticket }: { ticket: TicketDetail }) {
  return (
    <PannelloScheda occhiello='Date'>
      <RigaDettaglio label='Aperto il'>
        <Data valore={ticket.created_at} forma='intera' />
      </RigaDettaglio>
      <RigaDettaglio label='Prima risposta'>
        <Data valore={ticket.first_response_at} forma='intera' />
      </RigaDettaglio>
      <RigaDettaglio label='Risolto il'>
        <Data valore={ticket.resolved_at} forma='intera' />
      </RigaDettaglio>
      <RigaDettaglio label='Chiuso il'>
        <Data valore={ticket.closed_at} forma='intera' />
      </RigaDettaglio>
    </PannelloScheda>
  )
}
