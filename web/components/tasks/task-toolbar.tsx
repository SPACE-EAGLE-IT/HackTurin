'use client'

import { useEffect, useState } from 'react'
import {
  CalendarIcon,
  CircleDotIcon,
  FlagIcon,
  FolderIcon,
  KanbanIcon,
  ListIcon,
  UserIcon,
} from 'lucide-react'

import { FacetToolbar, type FacetSpec } from '@/components/ds/facet-toolbar'
import { Interruttore } from '@/components/ds/interruttore'
import { FilterRow } from '@/components/ds/mega-filter'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  DUE_FILTER_LABEL,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  TASK_STATUSES,
  TASK_STATUS_LABEL,
  type DueFilter,
  type PersonRef,
  type ProjectRef,
} from '@/lib/tasks/types'
import { useUrlState } from '@/lib/url-state'

const SEARCH_DEBOUNCE_MS = 300
const FILTER_KEYS = ['q', 'stato', 'priorita', 'commessa', 'persona', 'scadenza', 'mie'] as const
const DUE_FILTERS = Object.keys(DUE_FILTER_LABEL) as DueFilter[]

export function TaskToolbar({
  projects,
  people,
  resultCount,
}: {
  projects: ProjectRef[]
  people: PersonRef[]
  resultCount: number
}) {
  const { get, getList, set, setMany, toggleInList } = useUrlState()

  const urlQ = get('q') ?? ''
  const [q, setQ] = useState(urlQ)
  const [lastUrlQ, setLastUrlQ] = useState(urlQ)
  // The URL changed from outside (back button, a cleared filter): the box follows it unless the user is typing.
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ)
    if (q === lastUrlQ) setQ(urlQ)
  }

  useEffect(() => {
    if (q.trim() === urlQ) return
    const timer = setTimeout(() => set('q', q.trim() || null), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [q, urlQ, set])

  const scadenza = get('scadenza')
  const mie = get('mie') === '1'
  const vista = get('vista') === 'board' ? 'board' : 'lista'

  const projectOptions = [
    ...projects.map(project => ({ value: project.id, label: `${project.code} · ${project.name}` })),
    { value: 'none', label: 'Senza appalto' },
  ]
  const peopleOptions = [
    ...people.map(person => ({ value: person.id, label: person.full_name })),
    { value: 'none', label: 'Non assegnata' },
  ]

  const facets: FacetSpec[] = [
    {
      key: 'stato',
      label: 'Stato',
      icon: CircleDotIcon,
      options: TASK_STATUSES.map(status => ({ value: status, label: TASK_STATUS_LABEL[status] })),
      selected: getList('stato'),
      onToggle: value => toggleInList('stato', value),
    },
    {
      key: 'priorita',
      label: 'Priorità',
      icon: FlagIcon,
      options: TASK_PRIORITIES.map(priority => ({ value: priority, label: TASK_PRIORITY_LABEL[priority] })),
      selected: getList('priorita'),
      onToggle: value => toggleInList('priorita', value),
    },
    {
      key: 'commessa',
      label: 'Appalto',
      icon: FolderIcon,
      options: projectOptions,
      selected: getList('commessa'),
      onToggle: value => toggleInList('commessa', value),
      search: projectOptions.length > 7 ? { placeholder: 'Cerca appalto' } : undefined,
    },
    {
      key: 'persona',
      label: 'Persona',
      icon: UserIcon,
      options: peopleOptions,
      selected: getList('persona'),
      onToggle: value => toggleInList('persona', value),
      search: { placeholder: 'Cerca persona' },
    },
    {
      key: 'scadenza',
      label: 'Scadenza',
      icon: CalendarIcon,
      single: true,
      options: DUE_FILTERS.map(due => ({ value: due, label: DUE_FILTER_LABEL[due] })),
      selected: scadenza ? [scadenza] : [],
      onToggle: value => set('scadenza', scadenza === value ? null : value),
    },
  ]

  const activeCount = facets.filter(facet => facet.selected.length > 0).length + (mie ? 1 : 0)

  const clearAll = () => {
    setQ('')
    setMany(Object.fromEntries(FILTER_KEYS.map(key => [key, null])))
  }

  return (
    <FacetToolbar
      search={{ placeholder: 'Cerca intervento', value: q, onChange: setQ }}
      facets={facets}
      activeCount={activeCount}
      onClearAll={clearAll}
      resultCount={resultCount}
      extraFilters={
        <FilterRow label='Solo le mie'>
          <Interruttore
            etichetta='Assegnate a me'
            acceso={mie}
            onAcceso={on => set('mie', on ? '1' : null)}
          />
        </FilterRow>
      }
      actions={
        <ToggleGroup
          type='single'
          variant='segmented'
          size='sm'
          value={vista}
          onValueChange={value => {
            if (value) set('vista', value === 'lista' ? null : value)
          }}
          aria-label='Vista'
        >
          <ToggleGroupItem value='lista' aria-label='Lista'>
            <ListIcon /> Lista
          </ToggleGroupItem>
          <ToggleGroupItem value='board' aria-label='Board'>
            <KanbanIcon /> Board
          </ToggleGroupItem>
        </ToggleGroup>
      }
    />
  )
}
