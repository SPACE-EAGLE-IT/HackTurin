'use client'

import { CircleDotIcon, ListIcon, MapIcon, MapPinIcon, RadioTowerIcon, TagIcon } from 'lucide-react'
import { useEffect, useState } from 'react'

import { FacetToolbar, type FacetSpec } from '@/components/ds/facet-toolbar'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { CAPS } from '@/lib/civic/cap'
import { CATEGORIES } from '@/lib/civic/categories'
import {
  REPORT_SOURCE_LABEL,
  REPORT_SOURCES,
  REPORT_STATUS_LABEL,
  REPORT_STATUSES,
} from '@/lib/segnalazioni/types'
import { useUrlState } from '@/lib/url-state'

const FILTER_KEYS = ['q', 'stato', 'categoria', 'fonte', 'cap'] as const

export function ReportToolbar({ resultCount }: { resultCount: number }) {
  const { get, getList, set, setMany, toggleInList } = useUrlState()
  const urlQ = get('q') ?? ''
  const [q, setQ] = useState(urlQ)
  const [lastUrlQ, setLastUrlQ] = useState(urlQ)
  if (urlQ !== lastUrlQ) {
    setLastUrlQ(urlQ)
    if (q === lastUrlQ) setQ(urlQ)
  }
  useEffect(() => {
    if (q.trim() === urlQ) return
    const timer = setTimeout(() => set('q', q.trim() || null), 300)
    return () => clearTimeout(timer)
  }, [q, urlQ, set])

  const vista = get('vista') === 'mappa' ? 'mappa' : 'lista'
  const facets: FacetSpec[] = [
    {
      key: 'stato',
      label: 'Stato',
      icon: CircleDotIcon,
      options: REPORT_STATUSES.map(s => ({ value: s, label: REPORT_STATUS_LABEL[s] })),
      selected: getList('stato'),
      onToggle: value => toggleInList('stato', value),
    },
    {
      key: 'categoria',
      label: 'Categoria',
      icon: TagIcon,
      options: CATEGORIES.map(c => ({ value: c.slug, label: c.name })),
      selected: getList('categoria'),
      onToggle: value => toggleInList('categoria', value),
    },
    {
      key: 'fonte',
      label: 'Fonte',
      icon: RadioTowerIcon,
      options: REPORT_SOURCES.map(s => ({ value: s, label: REPORT_SOURCE_LABEL[s] })),
      selected: getList('fonte'),
      onToggle: value => toggleInList('fonte', value),
    },
    {
      key: 'cap',
      label: 'CAP',
      icon: MapPinIcon,
      options: CAPS.map(c => ({ value: c, label: c })),
      selected: getList('cap'),
      onToggle: value => toggleInList('cap', value),
      search: { placeholder: 'Cerca CAP' },
    },
  ]

  return (
    <FacetToolbar
      search={{ placeholder: 'Cerca nella descrizione o CAP', value: q, onChange: setQ }}
      facets={facets}
      activeCount={facets.filter(f => f.selected.length > 0).length}
      onClearAll={() => {
        setQ('')
        setMany(Object.fromEntries(FILTER_KEYS.map(k => [k, null])))
      }}
      resultCount={resultCount}
      actions={
        <ToggleGroup
          type='single'
          variant='segmented'
          size='sm'
          value={vista}
          onValueChange={v => v && set('vista', v === 'lista' ? null : v)}
          aria-label='Vista'
        >
          <ToggleGroupItem value='lista' aria-label='Lista'>
            <ListIcon /> Lista
          </ToggleGroupItem>
          <ToggleGroupItem value='mappa' aria-label='Mappa'>
            <MapIcon /> Mappa
          </ToggleGroupItem>
        </ToggleGroup>
      }
    />
  )
}
