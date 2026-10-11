'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { DialogoAzione } from '@/components/ds/dialogo-azione'
import { DateTrigger, PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { NumberField } from '@/components/ds/number-field'
import { Scelta } from '@/components/ds/scelta'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createTask } from '@/lib/tasks/actions'
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  type PersonRef,
  type ProjectRef,
  type TaskPriority,
} from '@/lib/tasks/types'

const FORM_ID = 'new-task'

type Draft = {
  title: string
  projectId: string | null
  assigneeId: string | null
  priority: TaskPriority
  dueDate?: string
  estimatedHours: number | null
  description: string
}

const emptyDraft = (projectId: string | null): Draft => ({
  title: '',
  projectId,
  assigneeId: null,
  priority: 'medium',
  dueDate: undefined,
  estimatedHours: null,
  description: '',
})

const PRIORITY_OPTIONS = TASK_PRIORITIES.map(priority => ({
  value: priority,
  label: TASK_PRIORITY_LABEL[priority],
}))

export function NewTaskButton({
  projects,
  people,
  defaultProjectId,
  variant = 'default',
}: {
  projects: ProjectRef[]
  people: PersonRef[]
  defaultProjectId?: string | null
  variant?: 'default' | 'outline'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(defaultProjectId ?? null))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(current => ({ ...current, [key]: value }))

  const reset = () => {
    setDraft(emptyDraft(defaultProjectId ?? null))
    setErrors({})
  }

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startTransition(async () => {
      const result = await createTask({
        title: draft.title,
        description: draft.description,
        projectId: draft.projectId,
        assigneeId: draft.assigneeId,
        priority: draft.priority,
        dueDate: draft.dueDate ?? null,
        estimatedHours: draft.estimatedHours,
      })
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        if (!result.fieldErrors) toast.error(result.message)
        return
      }
      toast.success('Task creata')
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  const projectOptions = projects.map(project => ({
    value: project.id,
    label: `${project.code} · ${project.name}`,
  }))
  const peopleOptions = people.map(person => ({ value: person.id, label: person.full_name }))

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <PlusIcon /> Nuovo intervento
      </Button>
      <DialogoAzione
        open={open}
        onOpenChange={onOpenChange}
        titolo='Nuovo intervento'
        natura='creazione'
        azione={{ etichetta: 'Crea intervento', type: 'submit', form: FORM_ID, attesa: pending }}
      >
        <form id={FORM_ID} onSubmit={onSubmit}>
          <FormGrid>
            <PropertyField label='Titolo' span>
              <Input
                name='title'
                value={draft.title}
                onChange={event => update('title', event.target.value)}
                autoFocus
                required
                maxLength={200}
                aria-invalid={errors.title ? true : undefined}
              />
              <FieldError message={errors.title} />
            </PropertyField>
            <PropertyField label='Appalto'>
              <Scelta
                opzioni={projectOptions}
                value={draft.projectId}
                onValueChange={value => update('projectId', value)}
                azzera='Nessuna'
                cerca='Cerca appalto'
                placeholder='Nessuna'
              />
              <FieldError message={errors.projectId} />
            </PropertyField>
            <PropertyField label='Assegnata a'>
              <Scelta
                opzioni={peopleOptions}
                value={draft.assigneeId}
                onValueChange={value => update('assigneeId', value)}
                azzera='Nessuno'
                cerca='Cerca persona'
                placeholder='Nessuno'
              />
              <FieldError message={errors.assigneeId} />
            </PropertyField>
            <PropertyField label='Priorità'>
              <Scelta
                opzioni={PRIORITY_OPTIONS}
                value={draft.priority}
                onValueChange={value => update('priority', value as TaskPriority)}
              />
              <FieldError message={errors.priority} />
            </PropertyField>
            <PropertyField label='Scadenza'>
              <DateTrigger
                value={draft.dueDate}
                onChange={value => update('dueDate', value)}
                placeholder='Scegli una data'
              />
              <FieldError message={errors.dueDate} />
            </PropertyField>
            <PropertyField label='Ore stimate'>
              <NumberField
                value={draft.estimatedHours}
                onValueChange={value => update('estimatedHours', value)}
                decimals={1}
                unit='h'
              />
              <FieldError message={errors.estimatedHours} />
            </PropertyField>
            <PropertyField label='Descrizione' span>
              <Textarea
                name='description'
                value={draft.description}
                onChange={event => update('description', event.target.value)}
                rows={4}
                maxLength={4000}
              />
              <FieldError message={errors.description} />
            </PropertyField>
          </FormGrid>
        </form>
      </DialogoAzione>
    </>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className='text-destructive text-xs'>{message}</p>
}
