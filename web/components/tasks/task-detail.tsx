'use client'

import Link from 'next/link'
import { useState, useTransition, type KeyboardEvent } from 'react'
import { Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { BottoneIcona } from '@/components/ds/bottone-icona'
import { ConfirmDialog } from '@/components/ds/confirm-dialog'
import { Data } from '@/components/ds/data'
import { EmptyState } from '@/components/ds/empty-state'
import { DateTrigger } from '@/components/ds/field-trigger'
import { NumberField } from '@/components/ds/number-field'
import { PannelloScheda, RigaDettaglio } from '@/components/ds/pannello-scheda'
import { Scelta } from '@/components/ds/scelta'
import { SectionCard } from '@/components/ds/section-card'
import { TagChip } from '@/components/ds/tag-chip'
import { ValoreLetto } from '@/components/ds/valore-letto'
import { Person } from '@/components/people/person-ref'
import { TaskPriorityBadge, TaskStatusBadge } from '@/components/tasks/task-badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { numeroIt } from '@/lib/format-number'
import { addComment, deleteComment, updateTask } from '@/lib/tasks/actions'
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type PersonRef,
  type ProjectRef,
  type TaskDetail as TaskDetailData,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/tasks/types'

/** The fields a detail control may send to `updateTask`. */
type TaskPatch = {
  status?: TaskStatus
  priority?: TaskPriority
  projectId?: string | null
  assigneeId?: string | null
  dueDate?: string | null
  estimatedHours?: number | null
  tags?: string[]
  description?: string | null
}

type Save = (patch: TaskPatch) => void

const STATUS_OPTIONS = TASK_STATUSES.map(status => ({ value: status, label: TASK_STATUS_LABEL[status] }))
const PRIORITY_OPTIONS = TASK_PRIORITIES.map(priority => ({
  value: priority,
  label: TASK_PRIORITY_LABEL[priority],
}))

export function TaskDetail({
  task,
  projects,
  people,
  canWrite,
  currentProfileId,
}: {
  task: TaskDetailData
  projects: ProjectRef[]
  people: PersonRef[]
  canWrite: boolean
  currentProfileId: string
}) {
  const [pending, startTransition] = useTransition()

  const save: Save = patch =>
    startTransition(async () => {
      const result = await updateTask(task.id, patch)
      if (!result.ok) toast.error(result.message)
    })

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]'>
      <div className='space-y-6'>
        <DescriptionCard task={task} canWrite={canWrite} save={save} />
        <CommentsCard task={task} canWrite={canWrite} currentProfileId={currentProfileId} />
      </div>
      <div className='space-y-6'>
        <PropertiesPanel
          task={task}
          projects={projects}
          people={people}
          canWrite={canWrite}
          pending={pending}
          save={save}
        />
        <DatesPanel task={task} />
      </div>
    </div>
  )
}

function DescriptionCard({ task, canWrite, save }: { task: TaskDetailData; canWrite: boolean; save: Save }) {
  const saved = task.description ?? ''
  const [draft, setDraft] = useState(saved)
  const [lastSaved, setLastSaved] = useState(saved)
  // The server sent a new description (own save or someone else's): the box follows it.
  if (saved !== lastSaved) {
    setLastSaved(saved)
    setDraft(saved)
  }

  return (
    <SectionCard title='Descrizione'>
      {canWrite ? (
        <Textarea
          value={draft}
          onChange={event => setDraft(event.target.value)}
          onBlur={() => {
            if (draft.trim() !== saved) save({ description: draft })
          }}
          rows={6}
          maxLength={4000}
          placeholder='Aggiungi una descrizione'
          aria-label='Descrizione'
        />
      ) : saved ? (
        <p className='text-sm whitespace-pre-wrap'>{saved}</p>
      ) : (
        <EmptyState compatto testo='Nessuna descrizione' />
      )}
    </SectionCard>
  )
}

function CommentsCard({
  task,
  canWrite,
  currentProfileId,
}: {
  task: TaskDetailData
  canWrite: boolean
  currentProfileId: string
}) {
  const [body, setBody] = useState('')
  const [toDelete, setToDelete] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const submit = () =>
    startTransition(async () => {
      const result = await addComment({ taskId: task.id, body })
      if (!result.ok) {
        toast.error(result.fieldErrors?.body ?? result.message)
        return
      }
      setBody('')
      toast.success('Commento aggiunto')
    })

  const remove = async (id: string) => {
    const result = await deleteComment(id, task.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setToDelete(null)
    toast.success('Commento eliminato')
  }

  return (
    <SectionCard title='Commenti'>
      <div className='space-y-4'>
        {task.comments.length === 0 ? (
          <EmptyState compatto testo='Nessun commento' />
        ) : (
          <ul className='space-y-4'>
            {task.comments.map(comment => (
              <li key={comment.id} className='flex items-start gap-3'>
                <div className='min-w-0 flex-1 space-y-1'>
                  <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
                    <Person person={comment.author} size='xs' emptyLabel='Utente rimosso' />
                    <Data valore={comment.created_at} forma='eta' className='text-muted-foreground text-xs' />
                  </div>
                  <p className='text-sm whitespace-pre-wrap'>{comment.body}</p>
                </div>
                {(canWrite || comment.author_id === currentProfileId) && (
                  <BottoneIcona
                    etichetta='Elimina commento'
                    icona={<Trash2Icon />}
                    onClick={() => setToDelete(comment.id)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
        {canWrite && (
          <div className='space-y-2'>
            <Textarea
              value={body}
              onChange={event => setBody(event.target.value)}
              rows={3}
              maxLength={4000}
              placeholder='Scrivi un commento'
              aria-label='Nuovo commento'
            />
            <div className='flex justify-end'>
              <Button variant='outline' onClick={submit} disabled={pending || body.trim() === ''}>
                {pending && <Spinner />} Commenta
              </Button>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={toDelete !== null}
        title='Eliminare il commento?'
        description='Il commento sparisce per tutti. Non si può annullare.'
        confirmLabel='Elimina'
        tone='destructive'
        onConfirm={() => (toDelete ? remove(toDelete) : undefined)}
        onClose={() => setToDelete(null)}
      />
    </SectionCard>
  )
}

function PropertiesPanel({
  task,
  projects,
  people,
  canWrite,
  pending,
  save,
}: {
  task: TaskDetailData
  projects: ProjectRef[]
  people: PersonRef[]
  canWrite: boolean
  pending: boolean
  save: Save
}) {
  const [tagDraft, setTagDraft] = useState('')
  const projectLabel = task.project ? `${task.project.code} · ${task.project.name}` : null

  if (!canWrite) {
    return (
      <PannelloScheda occhiello='Proprietà'>
        {task.report_id && (
          <RigaDettaglio label='Segnalazione'>
            <Link href={`/segnalazioni/${task.report_id}`} className='hover:underline'>
              Apri la segnalazione
            </Link>
          </RigaDettaglio>
        )}
        <RigaDettaglio label='Stato'>
          <TaskStatusBadge status={task.status} />
        </RigaDettaglio>
        <RigaDettaglio label='Priorità'>
          <TaskPriorityBadge priority={task.priority} />
        </RigaDettaglio>
        <RigaDettaglio label='Appalto'>
          <ValoreLetto valore={projectLabel} />
        </RigaDettaglio>
        <RigaDettaglio label='Assegnata a'>
          <Person person={task.assignee} size='xs' />
        </RigaDettaglio>
        <RigaDettaglio label='Scadenza'>
          <ValoreLetto valore={task.due_date ? <Data valore={task.due_date} forma='intera' /> : null} />
        </RigaDettaglio>
        <RigaDettaglio label='Ore stimate'>
          <ValoreLetto valore={task.estimated_hours != null ? `${numeroIt(task.estimated_hours)} h` : null} />
        </RigaDettaglio>
        <RigaDettaglio label='Tag'>
          {task.tags.length > 0 ? (
            <div className='flex flex-wrap gap-1'>
              {task.tags.map(tag => (
                <TagChip key={tag} tag={tag} />
              ))}
            </div>
          ) : (
            <ValoreLetto valore={null} />
          )}
        </RigaDettaglio>
      </PannelloScheda>
    )
  }

  const projectOptions = projects.map(project => ({
    value: project.id,
    label: `${project.code} · ${project.name}`,
  }))
  const peopleOptions = people.map(person => ({ value: person.id, label: person.full_name }))

  const addTag = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const tag = tagDraft.trim()
    setTagDraft('')
    if (tag && !task.tags.includes(tag)) save({ tags: [...task.tags, tag] })
  }

  return (
    <PannelloScheda occhiello='Proprietà'>
      {task.report_id && (
        <RigaDettaglio label='Segnalazione'>
          <Link href={`/segnalazioni/${task.report_id}`} className='hover:underline'>
            Apri la segnalazione
          </Link>
        </RigaDettaglio>
      )}
      <RigaDettaglio label='Stato'>
        <Scelta
          opzioni={STATUS_OPTIONS}
          value={task.status}
          onValueChange={value => save({ status: value as TaskStatus })}
          disabled={pending}
        />
      </RigaDettaglio>
      <RigaDettaglio label='Priorità'>
        <Scelta
          opzioni={PRIORITY_OPTIONS}
          value={task.priority}
          onValueChange={value => save({ priority: value as TaskPriority })}
          disabled={pending}
        />
      </RigaDettaglio>
      <RigaDettaglio label='Appalto'>
        <Scelta
          opzioni={projectOptions}
          value={task.project_id}
          onValueChange={value => save({ projectId: value })}
          azzera='Nessuna'
          cerca='Cerca appalto'
          placeholder='Nessuna'
          disabled={pending}
        />
      </RigaDettaglio>
      <RigaDettaglio label='Assegnata a'>
        <Scelta
          opzioni={peopleOptions}
          value={task.assignee_id}
          onValueChange={value => save({ assigneeId: value })}
          azzera='Nessuno'
          cerca='Cerca persona'
          placeholder='Nessuno'
          disabled={pending}
        />
      </RigaDettaglio>
      <RigaDettaglio label='Scadenza'>
        <DateTrigger
          value={task.due_date ?? undefined}
          onChange={value => save({ dueDate: value ?? null })}
          placeholder='Nessuna'
        />
      </RigaDettaglio>
      <RigaDettaglio label='Ore stimate'>
        <NumberField
          value={task.estimated_hours}
          onValueChange={value => {
            if (value !== task.estimated_hours) save({ estimatedHours: value })
          }}
          decimals={1}
          unit='h'
          aria-label='Ore stimate'
        />
      </RigaDettaglio>
      <RigaDettaglio label='Tag'>
        <div className='space-y-2'>
          {task.tags.length > 0 && (
            <div className='flex flex-wrap gap-1'>
              {task.tags.map(tag => (
                <TagChip
                  key={tag}
                  tag={tag}
                  onRemove={() => save({ tags: task.tags.filter(t => t !== tag) })}
                />
              ))}
            </div>
          )}
          <Input
            value={tagDraft}
            onChange={event => setTagDraft(event.target.value)}
            onKeyDown={addTag}
            maxLength={40}
            placeholder='Aggiungi un tag e premi Invio'
            aria-label='Nuovo tag'
          />
        </div>
      </RigaDettaglio>
    </PannelloScheda>
  )
}

function DatesPanel({ task }: { task: TaskDetailData }) {
  return (
    <PannelloScheda occhiello='Date'>
      <RigaDettaglio label='Creata il'>
        <Data valore={task.created_at} forma='intera' />
      </RigaDettaglio>
      <RigaDettaglio label='Aggiornata il'>
        <Data valore={task.updated_at} forma='intera' />
      </RigaDettaglio>
      <RigaDettaglio label='Completata il'>
        {task.completed_at ? (
          <Data valore={task.completed_at} forma='intera' />
        ) : (
          <span className='text-muted-foreground'>—</span>
        )}
      </RigaDettaglio>
    </PannelloScheda>
  )
}
