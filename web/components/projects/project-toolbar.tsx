'use client'

import { CircleDotIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { FacetToolbar, type FacetSpec } from '@/components/ds/facet-toolbar'
import { PROJECT_STATUSES, PROJECT_STATUS_LABEL } from '@/lib/projects/types'
import { useUrlState } from '@/lib/url-state'

const SEARCH_DELAY_MS = 300

const STATUS_OPTIONS = PROJECT_STATUSES.map(status => ({
  value: status,
  label: PROJECT_STATUS_LABEL[status],
}))

export function ProjectToolbar({ resultCount }: { resultCount: number }) {
  const { get, getList, set, setMany, toggleInList } = useUrlState()
  const urlQuery = get('q') ?? ''
  const statuses = getList('stato')

  // The draft remembers the URL it was typed over: a URL changed elsewhere discards it.
  const [draft, setDraft] = useState<{ value: string; base: string } | null>(null)
  const query = draft && draft.base === urlQuery ? draft.value : urlQuery

  useEffect(() => {
    if (!draft || draft.base !== urlQuery || draft.value === urlQuery) return
    const timer = setTimeout(() => set('q', draft.value || null), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [draft, urlQuery, set])

  const facets: FacetSpec[] = [
    {
      key: 'stato',
      label: 'Stato',
      icon: CircleDotIcon,
      options: STATUS_OPTIONS,
      selected: statuses,
      onToggle: value => toggleInList('stato', value),
    },
  ]

  return (
    <FacetToolbar
      search={{
        placeholder: 'Cerca appalto',
        value: query,
        onChange: value => setDraft({ value, base: urlQuery }),
      }}
      facets={facets}
      activeCount={statuses.length}
      onClearAll={() => {
        setDraft(null)
        setMany({ q: null, stato: null })
      }}
      resultCount={resultCount}
    />
  )
}
