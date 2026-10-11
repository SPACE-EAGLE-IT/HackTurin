'use client'

import { useMemo, useState, useTransition, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'

import { Avviso } from '@/components/ds/avviso'
import { Data } from '@/components/ds/data'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { DateTrigger, PropertyField } from '@/components/ds/field-trigger'
import { FormGrid } from '@/components/ds/form-grid'
import { Interruttore } from '@/components/ds/interruttore'
import { MeterRow } from '@/components/ds/meter-row'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { NumberField } from '@/components/ds/number-field'
import { Scelta } from '@/components/ds/scelta'
import { SectionCard } from '@/components/ds/section-card'
import { StatusBadge } from '@/components/ds/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useIsMobile } from '@/hooks/use-mobile'
import { todayKey } from '@/lib/date-keys'
import { addExpense } from '@/lib/missioni/actions'
import {
  allowanceFor,
  DAILY_CAP,
  euro,
  EXPENSE_KIND_LABEL,
  EXPENSE_KINDS,
  type ExpenseKind,
  type ExpenseUsage,
  type MissionExpense,
  MONTHLY_CAP,
} from '@/lib/missioni/types'

const KIND_OPTIONS = EXPENSE_KINDS.map(kind => ({ value: kind, label: EXPENSE_KIND_LABEL[kind] }))

export function MissionExpenses({
  missionId,
  expenses,
  usage,
  canAdd,
}: {
  missionId: string
  expenses: MissionExpense[]
  /** The current volunteer's self-certified expenses (for the remaining allowance). */
  usage: ExpenseUsage[]
  /** The current user is the mission's volunteer. */
  canAdd: boolean
}) {
  const isMobile = useIsMobile()
  const router = useRouter()
  const [spentOn, setSpentOn] = useState<string | undefined>(todayKey)
  const [kind, setKind] = useState<ExpenseKind>('trasporto')
  const [amount, setAmount] = useState<number | null>(null)
  const [selfCertified, setSelfCertified] = useState(true)
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const allowance = allowanceFor(usage, spentOn ?? todayKey())
  const total = expenses.reduce((sum, row) => sum + Number(row.amount), 0)
  const columns = useMemo(() => buildColumns(), [])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    startTransition(async () => {
      setErrors({})
      setMessage(null)
      const result = await addExpense({ missionId, spentOn, kind, amount, selfCertified, note })
      if (!result.ok) {
        if (result.fieldErrors) setErrors(result.fieldErrors)
        else setMessage(result.message)
        return
      }
      toast.success('Spesa registrata')
      setAmount(null)
      setNote('')
      router.refresh()
    })
  }

  return (
    <SectionCard
      title='Rimborsi spese'
      info='Il volontario non è retribuito: l’associazione rimborsa solo le spese. Quelle autocertificate hanno un tetto di 10 € al giorno e 150 € al mese (CTS art. 17 c.4).'
      action={
        expenses.length > 0 ? <span className='text-muted-foreground text-sm'>{euro(total)}</span> : undefined
      }
    >
      <div className='space-y-4'>
        {expenses.length === 0 ? (
          <EmptyState compatto testo='Nessuna spesa registrata' />
        ) : isMobile ? (
          <MobileRowList>
            {expenses.map((row, index) => (
              <MobileRow
                key={row.id}
                index={index}
                title={`${EXPENSE_KIND_LABEL[row.kind]} · ${euro(Number(row.amount))}`}
                meta={[<Data key='d' valore={row.spent_on} forma='corta' />, row.note]}
                signal={<ReimbursedBadge reimbursedAt={row.reimbursed_at} />}
              />
            ))}
          </MobileRowList>
        ) : (
          <DataTable
            data={expenses}
            columns={columns}
            densita='fitta'
            cornice={false}
            footer={({ rese, totali }) => `${rese} di ${totali} spese`}
          />
        )}

        {canAdd && (
          <form onSubmit={onSubmit} className='space-y-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <MeterRow
                label='Disponibile nel giorno'
                value={`${euro(allowance.dayLeft)} di ${euro(DAILY_CAP)}`}
                pct={(allowance.dayUsed / DAILY_CAP) * 100}
                fillClassName={allowance.dayLeft <= 0 ? 'bg-destructive' : 'bg-success'}
              />
              <MeterRow
                label='Disponibile nel mese'
                value={`${euro(allowance.monthLeft)} di ${euro(MONTHLY_CAP)}`}
                pct={(allowance.monthUsed / MONTHLY_CAP) * 100}
                fillClassName={allowance.monthLeft <= 0 ? 'bg-destructive' : 'bg-success'}
              />
            </div>
            <FormGrid>
              <PropertyField label='Data'>
                <DateTrigger value={spentOn} onChange={setSpentOn} placeholder='Scegli una data' />
                <FieldError message={errors.spentOn} />
              </PropertyField>
              <PropertyField label='Tipo'>
                <Scelta
                  opzioni={KIND_OPTIONS}
                  value={kind}
                  onValueChange={value => setKind(value as ExpenseKind)}
                />
              </PropertyField>
              <PropertyField label='Importo'>
                <NumberField value={amount} onValueChange={setAmount} decimals={2} unit='€' />
                <FieldError message={errors.amount} />
              </PropertyField>
              <PropertyField label='Autocertificata'>
                <Interruttore
                  etichetta='Senza ricevuta'
                  descrizione='Con ricevuta il tetto non si applica.'
                  acceso={selfCertified}
                  onAcceso={setSelfCertified}
                />
              </PropertyField>
              <PropertyField label='Nota' span>
                <Input value={note} onChange={event => setNote(event.target.value)} maxLength={300} />
                <FieldError message={errors.note} />
              </PropertyField>
            </FormGrid>
            {message && <Avviso tono='destructive'>{message}</Avviso>}
            <div className='flex justify-end'>
              <Button type='submit' variant='outline' disabled={pending}>
                {pending && <Spinner />} Aggiungi spesa
              </Button>
            </div>
          </form>
        )}
      </div>
    </SectionCard>
  )
}

function ReimbursedBadge({ reimbursedAt }: { reimbursedAt: string | null }) {
  return reimbursedAt ? (
    <StatusBadge tone='success' dot>
      Rimborsata
    </StatusBadge>
  ) : (
    <StatusBadge tone='warning' dot>
      Da rimborsare
    </StatusBadge>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className='text-destructive text-xs'>{message}</p>
}

function buildColumns(): ColumnDef<MissionExpense>[] {
  return [
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
      accessorFn: row => Number(row.amount),
      header: 'Importo',
      cell: ({ row }) => <span className='tabular-nums'>{euro(Number(row.original.amount))}</span>,
    },
    {
      id: 'self',
      accessorKey: 'self_certified',
      header: 'Autocertificata',
      cell: ({ row }) => (row.original.self_certified ? 'Sì' : 'No'),
    },
    {
      id: 'note',
      accessorKey: 'note',
      header: 'Nota',
      cell: ({ row }) => row.original.note ?? <span className='text-muted-foreground'>—</span>,
    },
    {
      id: 'status',
      accessorKey: 'reimbursed_at',
      header: 'Stato',
      cell: ({ row }) => <ReimbursedBadge reimbursedAt={row.original.reimbursed_at} />,
    },
  ]
}
