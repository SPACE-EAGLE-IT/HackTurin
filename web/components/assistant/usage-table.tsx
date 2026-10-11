'use client'

import type { ColumnDef } from '@tanstack/react-table'

import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { useIsMobile } from '@/hooks/use-mobile'
import type { AiUsage } from '@/lib/ai/types'
import { AI_PROVIDER_PRESETS, type AiProvider } from '@/lib/ai/types'
import { numeroIt } from '@/lib/format-number'

type UsageRow = AiUsage['byModel'][number]

/** Rows store the provider key; the preset label is friendlier when one exists. */
function providerLabel(provider: string) {
  return provider in AI_PROVIDER_PRESETS ? AI_PROVIDER_PRESETS[provider as AiProvider].label : provider
}

const NUMERIC = { headClassName: 'text-right', cellClassName: 'text-right tabular-nums' }

const columns: ColumnDef<UsageRow>[] = [
  {
    id: 'provider',
    accessorKey: 'provider',
    header: 'Provider',
    cell: ({ row }) => providerLabel(row.original.provider),
  },
  {
    id: 'model',
    accessorKey: 'model',
    header: 'Modello',
    cell: ({ row }) => <span className='font-medium'>{row.original.model}</span>,
    meta: { elastica: true },
  },
  {
    id: 'calls',
    accessorKey: 'calls',
    header: 'Chiamate',
    cell: ({ row }) => numeroIt(row.original.calls),
    meta: NUMERIC,
  },
  {
    id: 'inputTokens',
    accessorKey: 'inputTokens',
    header: 'Token in',
    cell: ({ row }) => numeroIt(row.original.inputTokens),
    meta: NUMERIC,
  },
  {
    id: 'outputTokens',
    accessorKey: 'outputTokens',
    header: 'Token out',
    cell: ({ row }) => numeroIt(row.original.outputTokens),
    meta: NUMERIC,
  },
]

export function UsageTable({ rows }: { rows: UsageRow[] }) {
  const isMobile = useIsMobile()

  if (rows.length === 0) return <EmptyState compatto testo='Nessuna chiamata questo mese' />

  if (isMobile) {
    return (
      <MobileRowList>
        {rows.map((row, index) => (
          <MobileRow
            key={`${row.provider}/${row.model}`}
            index={index}
            title={row.model}
            meta={[providerLabel(row.provider), `${numeroIt(row.calls)} chiamate`]}
          />
        ))}
      </MobileRowList>
    )
  }

  return (
    <DataTable
      data={rows}
      columns={columns}
      cornice={false}
      densita='media'
      footer={rows.length === 1 ? '1 modello' : `${rows.length} modelli`}
    />
  )
}
