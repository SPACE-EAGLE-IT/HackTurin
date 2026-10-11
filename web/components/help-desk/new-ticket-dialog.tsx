'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { DialogoAzione } from '@/components/ds/dialogo-azione'
import { DateTrigger, PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { Scelta } from '@/components/ds/scelta'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createTicket } from '@/lib/help-desk/actions'
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABEL,
  type CategoryRef,
  type TicketPriority,
} from '@/lib/help-desk/types'
import type { PersonRef, ProjectRef } from '@/lib/tasks/types'

const FORM_ID = 'new-ticket'

type Draft = {
  title: string
  categoryId: string | null
  priority: TicketPriority
  requesterId: string | null
  requesterName: string
  requesterEmail: string
  assigneeId: string | null
  projectId: string | null
  dueDate?: string
  description: string
}

const emptyDraft = (): Draft => ({
  title: '',
  categoryId: null,
  priority: 'medium',
  requesterId: null,
  requesterName: '',
  requesterEmail: '',
  assigneeId: null,
  projectId: null,
  dueDate: undefined,
  description: '',
})

const PRIORITY_OPTIONS = TICKET_PRIORITIES.map(priority => ({
  value: priority,
  label: TICKET_PRIORITY_LABEL[priority],
}))

/** A non-empty trimmed text, or `undefined` so the action treats the field as untouched. */
const textOrUndefined = (value: string) => value.trim() || undefined

export function NewTicketButton({
  categories,
  people,
  projects,
  variant = 'default',
}: {
  categories: CategoryRef[]
  people: PersonRef[]
  projects: ProjectRef[]
  variant?: 'default' | 'outline'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [pending, startTransition] = useTransition()

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(current => ({ ...current, [key]: value }))

  const reset = () => {
    setDraft(emptyDraft())
    setErrors({})
  }

  const onOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startTransition(async () => {
      const external = draft.requesterId === null
      const result = await createTicket({
        title: draft.title,
        description: textOrUndefined(draft.description),
        categoryId: draft.categoryId ?? undefined,
        priority: draft.priority,
        requesterId: draft.requesterId ?? undefined,
        requesterName: external ? textOrUndefined(draft.requesterName) : undefined,
        requesterEmail: external ? textOrUndefined(draft.requesterEmail) : undefined,
        assigneeId: draft.assigneeId ?? undefined,
        projectId: draft.projectId ?? undefined,
        dueDate: draft.dueDate,
      })
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {})
        if (!result.fieldErrors) toast.error(result.message)
        return
      }
      toast.success('Ticket aperto')
      setOpen(false)
      reset()
      router.push(`/help-desk/${result.data.id}`)
    })
  }

  const categoryOptions = categories.map(category => ({ value: category.id, label: category.name }))
  const peopleOptions = people.map(person => ({ value: person.id, label: person.full_name }))
  const projectOptions = projects.map(project => ({
    value: project.id,
    label: `${project.code} · ${project.name}`,
  }))

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <PlusIcon /> Nuovo ticket
      </Button>
      <DialogoAzione
        open={open}
        onOpenChange={onOpenChange}
        titolo='Nuovo ticket'
        natura='creazione'
        azione={{ etichetta: 'Apri ticket', type: 'submit', form: FORM_ID, attesa: pending }}
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
            <PropertyField label='Categoria'>
              <Scelta
                opzioni={categoryOptions}
                value={draft.categoryId}
                onValueChange={value => update('categoryId', value)}
                azzera='Nessuna'
                placeholder='Nessuna'
              />
              <FieldError message={errors.categoryId} />
            </PropertyField>
            <PropertyField label='Priorità'>
              <Scelta
                opzioni={PRIORITY_OPTIONS}
                value={draft.priority}
                onValueChange={value => update('priority', value as TicketPriority)}
              />
              <FieldError message={errors.priority} />
            </PropertyField>
            <PropertyField label='Richiedente'>
              <Scelta
                opzioni={peopleOptions}
                value={draft.requesterId}
                onValueChange={value => update('requesterId', value)}
                azzera='Persona esterna'
                cerca='Cerca persona'
                placeholder='Persona esterna'
              />
              <FieldError message={errors.requesterId} />
            </PropertyField>
            {draft.requesterId === null && (
              <>
                <PropertyField label='Nome richiedente'>
                  <Input
                    name='requesterName'
                    value={draft.requesterName}
                    onChange={event => update('requesterName', event.target.value)}
                    maxLength={120}
                    aria-invalid={errors.requesterName ? true : undefined}
                  />
                  <p className='text-muted-foreground text-xs'>Vuoto: il ticket è a tuo nome.</p>
                  <FieldError message={errors.requesterName} />
                </PropertyField>
                <PropertyField label='E-mail'>
                  <Input
                    name='requesterEmail'
                    type='email'
                    value={draft.requesterEmail}
                    onChange={event => update('requesterEmail', event.target.value)}
                    aria-invalid={errors.requesterEmail ? true : undefined}
                  />
                  <FieldError message={errors.requesterEmail} />
                </PropertyField>
              </>
            )}
            <PropertyField label='Assegnato a'>
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
            <PropertyField label='Commessa'>
              <Scelta
                opzioni={projectOptions}
                value={draft.projectId}
                onValueChange={value => update('projectId', value)}
                azzera='Nessuna'
                cerca='Cerca commessa'
                placeholder='Nessuna'
              />
              <FieldError message={errors.projectId} />
            </PropertyField>
            <PropertyField label='Scadenza'>
              <DateTrigger
                value={draft.dueDate}
                onChange={value => update('dueDate', value)}
                placeholder='Scegli una data'
              />
              <FieldError message={errors.dueDate} />
            </PropertyField>
            <PropertyField label='Descrizione' span>
              <Textarea
                name='description'
                value={draft.description}
                onChange={event => update('description', event.target.value)}
                rows={4}
                maxLength={8000}
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
