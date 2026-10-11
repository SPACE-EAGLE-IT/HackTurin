'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { Trash2Icon } from 'lucide-react'
import { type ReactNode, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ds/confirm-dialog'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MenuAzioni } from '@/components/ds/menu-azioni'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { NumberField } from '@/components/ds/number-field'
import { StatusBadge } from '@/components/ds/status-badge'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useIsMobile } from '@/hooks/use-mobile'
import { deleteCategory, updateCategory } from '@/lib/help-desk/actions'
import type { TicketCategory } from '@/lib/help-desk/types'

/** The fields a cell may send to `updateCategory`. */
type CategoryPatch = {
  name?: string
  description?: string | null
  sortOrder?: number
  isActive?: boolean
}

type Draft = Pick<TicketCategory, 'name' | 'description' | 'sort_order' | 'is_active'>

export function CategoryManager({ categories }: { categories: TicketCategory[] }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [, startTransition] = useTransition()
  // Optimistic values, kept until the revalidated page brings the same ones back.
  const [overrides, setOverrides] = useState<Record<string, Partial<Draft>>>({})
  const [toDelete, setToDelete] = useState<TicketCategory | null>(null)

  const draftOf = (category: TicketCategory): Draft => ({
    name: category.name,
    description: category.description,
    sort_order: category.sort_order,
    is_active: category.is_active,
    ...overrides[category.id],
  })

  function save(category: TicketCategory, patch: CategoryPatch, next: Partial<Draft>) {
    const previous = draftOf(category)
    const keys = Object.keys(next) as (keyof Draft)[]
    const before = Object.fromEntries(keys.map(key => [key, previous[key]])) as Partial<Draft>
    setOverrides(current => ({ ...current, [category.id]: { ...current[category.id], ...next } }))
    startTransition(async () => {
      const result = await updateCategory(category.id, patch)
      if (result.ok) return
      toast.error(Object.values(result.fieldErrors ?? {})[0] ?? result.message)
      setOverrides(current => ({ ...current, [category.id]: { ...current[category.id], ...before } }))
    })
  }

  const remove = async () => {
    if (!toDelete) return
    const result = await deleteCategory(toDelete.id)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setToDelete(null)
    toast.success('Categoria eliminata')
    router.refresh()
  }

  const countLabel = `${categories.length} ${categories.length === 1 ? 'categoria' : 'categorie'}`

  const nameCell = (category: TicketCategory) => (
    <TextCell
      value={draftOf(category).name}
      ariaLabel={`Nome: ${category.name}`}
      maxLength={60}
      required
      onCommit={name => save(category, { name }, { name })}
    />
  )
  const descriptionCell = (category: TicketCategory) => (
    <TextCell
      value={draftOf(category).description ?? ''}
      ariaLabel={`Descrizione: ${category.name}`}
      maxLength={200}
      placeholder='Nessuna descrizione'
      onCommit={text => {
        const description = text || null
        save(category, { description }, { description })
      }}
    />
  )
  const orderCell = (category: TicketCategory) => (
    <div className='w-24'>
      <NumberField
        value={draftOf(category).sort_order}
        onValueChange={value => {
          if (value !== null && value !== draftOf(category).sort_order)
            save(category, { sortOrder: value }, { sort_order: value })
        }}
        decimals={0}
        aria-label={`Ordine: ${category.name}`}
      />
    </div>
  )
  const activeSwitch = (category: TicketCategory) => (
    <Switch
      aria-label={`Attiva: ${category.name}`}
      checked={draftOf(category).is_active}
      onCheckedChange={checked => save(category, { isActive: checked }, { is_active: checked })}
    />
  )
  const menu = (category: TicketCategory) => (
    <MenuAzioni etichetta='Altre azioni'>
      <DropdownMenuItem variant='destructive' onSelect={() => setToDelete(category)}>
        <Trash2Icon /> Elimina
      </DropdownMenuItem>
    </MenuAzioni>
  )

  const confirm = (
    <ConfirmDialog
      open={toDelete !== null}
      title={toDelete ? `Eliminare la categoria «${toDelete.name}»?` : 'Eliminare la categoria?'}
      description='I ticket di questa categoria restano, senza categoria.'
      confirmLabel='Elimina'
      tone='destructive'
      onConfirm={remove}
      onClose={() => setToDelete(null)}
    />
  )

  if (categories.length === 0) return <EmptyState compatto testo='Nessuna categoria' />

  if (isMobile) {
    return (
      <div className='space-y-4'>
        <MobileRowList>
          {categories.map((category, index) => (
            <MobileRow
              key={category.id}
              index={index}
              title={draftOf(category).name}
              meta={[draftOf(category).description ?? 'Nessuna descrizione']}
              signal={
                draftOf(category).is_active ? undefined : (
                  <StatusBadge tone='muted' size='sm'>
                    Non attiva
                  </StatusBadge>
                )
              }
              titleExtra={menu(category)}
              footer={
                <div className='space-y-3'>
                  <FieldRow label='Nome'>{nameCell(category)}</FieldRow>
                  <FieldRow label='Descrizione'>{descriptionCell(category)}</FieldRow>
                  <FieldRow label='Ordine'>{orderCell(category)}</FieldRow>
                  <div className='flex items-center justify-between gap-3 text-sm'>
                    <span>Attiva</span>
                    {activeSwitch(category)}
                  </div>
                </div>
              }
            />
          ))}
        </MobileRowList>
        <p className='text-muted-foreground text-xs'>{countLabel}</p>
        {confirm}
      </div>
    )
  }

  const columns: ColumnDef<TicketCategory>[] = [
    {
      id: 'name',
      header: 'Nome',
      cell: ({ row }) => <div className='w-48'>{nameCell(row.original)}</div>,
    },
    {
      id: 'description',
      header: 'Descrizione',
      meta: { elastica: true },
      cell: ({ row }) => descriptionCell(row.original),
    },
    {
      id: 'order',
      header: 'Ordine',
      cell: ({ row }) => orderCell(row.original),
    },
    {
      id: 'active',
      header: 'Attiva',
      cell: ({ row }) => activeSwitch(row.original),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => menu(row.original),
    },
  ]

  return (
    <>
      <DataTable data={categories} columns={columns} footer={countLabel} densita='media' />
      {confirm}
    </>
  )
}

/** A text input that saves on blur and follows the server value when it changes. */
function TextCell({
  value,
  onCommit,
  ariaLabel,
  placeholder,
  maxLength,
  required = false,
}: {
  value: string
  onCommit: (value: string) => void
  ariaLabel: string
  placeholder?: string
  maxLength: number
  required?: boolean
}) {
  const [draft, setDraft] = useState(value)
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setDraft(value)
  }

  const commit = () => {
    const next = draft.trim()
    if (required && next === '') {
      setDraft(value)
      return
    }
    if (next !== value) onCommit(next)
  }

  return (
    <Input
      value={draft}
      onChange={event => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={event => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      maxLength={maxLength}
      placeholder={placeholder}
      aria-label={ariaLabel}
      required={required}
    />
  )
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='space-y-1'>
      <span className='text-muted-foreground text-xs'>{label}</span>
      {children}
    </div>
  )
}
