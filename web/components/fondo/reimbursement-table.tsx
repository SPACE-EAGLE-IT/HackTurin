'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckIcon, ReceiptIcon } from 'lucide-react'
import { toast } from 'sonner'

import { BulkActionBar } from '@/components/ds/bulk-action-bar'
import { CasellaFascia, statoCasella } from '@/components/ds/casella-fascia'
import { Data } from '@/components/ds/data'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { useIsMobile } from '@/hooks/use-mobile'
import { markReimbursed } from '@/lib/fondo/actions'
import { euro, EXPENSE_KIND_LABEL, type ExpenseToReimburse } from '@/lib/fondo/types'

/** Expenses to pay back, with per-volunteer totals and a selection to mark them reimbursed. */
export function ReimbursementTable({
  expenses,
  canWrite,
}: {
  expenses: ExpenseToReimburse[]
  canWrite: boolean
}) {
  const isMobile = useIsMobile()
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()

  // Total owed to each volunteer, shown next to every row of theirs.
  const totals = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    for (const row of expenses) {
      const key = row.volunteer?.id ?? ''
      const entry = map.get(key) ?? { total: 0, count: 0 }
      entry.total += row.amount
      entry.count++
      map.set(key, entry)
    }
    return map
  }, [expenses])

  const toggle = (id: string) =>
    setSelected(current => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const toggleAll = () =>
    setSelected(current =>
      current.size === expenses.length ? new Set() : new Set(expenses.map(row => row.id))
    )

  const columns = useMemo<ColumnDef<ExpenseToReimburse>[]>(() => {
    const base: ColumnDef<ExpenseToReimburse>[] = [
      {
        id: 'volunteer',
        accessorFn: row => row.volunteer?.full_name ?? '',
        header: 'Volontario',
        cell: ({ row }) => {
          const owed = totals.get(row.original.volunteer?.id ?? '')
          return (
            <div className='min-w-0'>
              <p className='font-medium'>{row.original.volunteer?.full_name ?? '—'}</p>
              <p className='text-muted-foreground text-xs'>
                {owed ? `${owed.count} spese · ${euro(owed.total)} in tutto` : ''}
              </p>
            </div>
          )
        },
      },
      {
        id: 'date',
        accessorKey: 'spent_on',
        header: 'Data',
        cell: ({ row }) => <Data valore={row.original.spent_on} forma='corta' />,
      },
      {
        id: 'kind',
        accessorKey: 'kind',
        header: 'Tipo',
        cell: ({ row }) => EXPENSE_KIND_LABEL[row.original.kind],
      },
      {
        id: 'amount',
        accessorKey: 'amount',
        header: 'Importo',
        cell: ({ row }) => <span className='tabular-nums'>{euro(row.original.amount)}</span>,
      },
      {
        id: 'self',
        accessorKey: 'self_certified',
        header: 'Autocertificata',
        cell: ({ row }) => (row.original.self_certified ? 'Sì' : 'No'),
      },
      {
        id: 'mission',
        accessorFn: row => row.mission?.title ?? '',
        header: 'Missione',
        cell: ({ row }) => row.original.mission?.title ?? '—',
      },
    ]
    if (!canWrite) return base
    return [
      {
        id: 'select',
        enableSorting: false,
        header: () => (
          <CasellaFascia
            stato={statoCasella(selected.size, expenses.length)}
            etichetta='Seleziona tutte'
            onSeleziona={toggleAll}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selected.has(row.original.id)}
            onCheckedChange={() => toggle(row.original.id)}
            aria-label='Seleziona spesa'
          />
        ),
      },
      ...base,
    ]
  }, [canWrite, expenses, selected, totals]) // eslint-disable-line react-hooks/exhaustive-deps

  const confirm = () =>
    startTransition(async () => {
      const result = await markReimbursed([...selected])
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(`${result.data.count} spese segnate rimborsate`)
      setSelected(new Set())
      router.refresh()
    })

  if (expenses.length === 0) {
    return <EmptyState icon={ReceiptIcon} title='Nessun rimborso da pagare' />
  }

  return (
    <div className='space-y-3'>
      {canWrite && (
        <BulkActionBar count={selected.size} noun='spese selezionate' onClear={() => setSelected(new Set())}>
          <Button size='sm' variant='outline' onClick={confirm} disabled={pending}>
            {pending ? <Spinner /> : <CheckIcon />} Segna rimborsate
          </Button>
        </BulkActionBar>
      )}
      {isMobile ? (
        <MobileRowList>
          {expenses.map((row, index) => (
            <MobileRow
              key={row.id}
              index={index}
              title={`${row.volunteer?.full_name ?? '—'} · ${euro(row.amount)}`}
              meta={[
                <Data key='d' valore={row.spent_on} forma='corta' />,
                EXPENSE_KIND_LABEL[row.kind],
                row.mission?.title,
              ]}
              leading={
                canWrite ? (
                  <Checkbox
                    checked={selected.has(row.id)}
                    onCheckedChange={() => toggle(row.id)}
                    aria-label='Seleziona spesa'
                  />
                ) : undefined
              }
            />
          ))}
        </MobileRowList>
      ) : (
        <DataTable
          data={expenses}
          columns={columns}
          densita='media'
          cornice={false}
          footer={({ rese, totali }) => `${rese} di ${totali} spese`}
        />
      )}
    </div>
  )
}
