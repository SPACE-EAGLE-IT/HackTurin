'use client'

import { useEffect, useState } from 'react'
import { CircleDotIcon, FlagIcon, TagIcon, UserIcon } from 'lucide-react'

import { FacetToolbar, type FacetSpec } from '@/components/ds/facet-toolbar'
import { Interruttore } from '@/components/ds/interruttore'
import { FilterRow } from '@/components/ds/mega-filter'
import {
  TICKET_PRIORITIES,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUSES,
  TICKET_STATUS_LABEL,
  type CategoryRef,
} from '@/lib/help-desk/types'
import type { PersonRef } from '@/lib/tasks/types'
import { useUrlState } from '@/lib/url-state'

const SEARCH_DEBOUNCE_MS = 300
const FILTER_KEYS = ['q', 'stato', 'priorita', 'categoria', 'persona', 'miei', 'scaduti'] as const

export function TicketToolbar({
  categories,
  people,
  resultCount,
}: {
  categories: CategoryRef[]
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

  const miei = get('miei') === '1'
  const scaduti = get('scaduti') === '1'

  const categoryOptions = categories.map(category => ({ value: category.id, label: category.name }))
  const peopleOptions = [
    ...people.map(person => ({ value: person.id, label: person.full_name })),
    { value: 'none', label: 'Non assegnato' },
  ]

  const facets: FacetSpec[] = [
    {
      key: 'stato',
      label: 'Stato',
      icon: CircleDotIcon,
      options: TICKET_STATUSES.map(status => ({ value: status, label: TICKET_STATUS_LABEL[status] })),
      selected: getList('stato'),
      onToggle: value => toggleInList('stato', value),
    },
    {
      key: 'priorita',
      label: 'Priorità',
      icon: FlagIcon,
      options: TICKET_PRIORITIES.map(priority => ({
        value: priority,
        label: TICKET_PRIORITY_LABEL[priority],
      })),
      selected: getList('priorita'),
      onToggle: value => toggleInList('priorita', value),
    },
    {
      key: 'categoria',
      label: 'Categoria',
      icon: TagIcon,
      options: categoryOptions,
      selected: getList('categoria'),
      onToggle: value => toggleInList('categoria', value),
      search: categoryOptions.length > 7 ? { placeholder: 'Cerca categoria' } : undefined,
    },
    {
      key: 'persona',
      label: 'Assegnato a',
      icon: UserIcon,
      options: peopleOptions,
      selected: getList('persona'),
      onToggle: value => toggleInList('persona', value),
      search: { placeholder: 'Cerca persona' },
    },
  ]

  const activeCount =
    facets.filter(facet => facet.selected.length > 0).length + (miei ? 1 : 0) + (scaduti ? 1 : 0)

  const clearAll = () => {
    setQ('')
    setMany(Object.fromEntries(FILTER_KEYS.map(key => [key, null])))
  }

  return (
    <FacetToolbar
      search={{ placeholder: 'Cerca ticket', value: q, onChange: setQ }}
      facets={facets}
      activeCount={activeCount}
      onClearAll={clearAll}
      resultCount={resultCount}
      extraFilters={
        <FilterRow label='Solo i miei'>
          <Interruttore
            etichetta='Assegnati a me'
            acceso={miei}
            onAcceso={on => set('miei', on ? '1' : null)}
          />
        </FilterRow>
      }
    />
  )
}
