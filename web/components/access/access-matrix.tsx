'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { UsersIcon } from 'lucide-react'
import { type ReactNode, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { Scelta } from '@/components/ds/scelta'
import { StatusBadge } from '@/components/ds/status-badge'
import { Person } from '@/components/people/person-ref'
import { Switch } from '@/components/ui/switch'
import { useIsMobile } from '@/hooks/use-mobile'
import { setAccessLevel, setAdmin } from '@/lib/access/actions'
import type { AccessMatrixRow } from '@/lib/access/queries'
import { ACCESS_LEVEL_LABEL, ACCESS_LEVELS, type AccessLevel, type Feature } from '@/lib/access/types'

const LEVEL_OPTIONS = ACCESS_LEVELS.map(level => ({ value: level, label: ACCESS_LEVEL_LABEL[level] }))

export function AccessMatrix({
  features,
  rows,
  currentProfileId,
}: {
  features: Feature[]
  rows: AccessMatrixRow[]
  currentProfileId: string | null
}) {
  const isMobile = useIsMobile()
  const [, startTransition] = useTransition()
  // Optimistic values, kept until the revalidated page brings the same ones back.
  const [levelOverrides, setLevelOverrides] = useState<Record<string, AccessLevel>>({})
  const [adminOverrides, setAdminOverrides] = useState<Record<string, boolean>>({})

  const isAdmin = (row: AccessMatrixRow) => adminOverrides[row.profile.id] ?? row.profile.is_admin
  const levelOf = (row: AccessMatrixRow, feature: Feature) =>
    levelOverrides[levelKey(row, feature)] ?? row.levels[feature.key] ?? feature.default_level
  const adminCount = rows.filter(isAdmin).length
  const isLastAdminSelf = (row: AccessMatrixRow) =>
    row.profile.id === currentProfileId && isAdmin(row) && adminCount <= 1

  function changeLevel(row: AccessMatrixRow, feature: Feature, level: AccessLevel) {
    const key = levelKey(row, feature)
    const previous = levelOf(row, feature)
    if (level === previous) return
    setLevelOverrides(current => ({ ...current, [key]: level }))
    startTransition(async () => {
      const result = await setAccessLevel({ profileId: row.profile.id, featureKey: feature.key, level })
      if (result.ok) return
      toast.error(result.message)
      setLevelOverrides(current => ({ ...current, [key]: previous }))
    })
  }

  function changeAdmin(row: AccessMatrixRow, next: boolean) {
    const previous = isAdmin(row)
    if (next === previous) return
    setAdminOverrides(current => ({ ...current, [row.profile.id]: next }))
    startTransition(async () => {
      const result = await setAdmin({ profileId: row.profile.id, isAdmin: next })
      if (result.ok) return
      toast.error(result.message)
      setAdminOverrides(current => ({ ...current, [row.profile.id]: previous }))
    })
  }

  const countLabel = `${rows.length} ${rows.length === 1 ? 'persona' : 'persone'}`

  if (rows.length === 0) {
    return <EmptyState icon={UsersIcon} title='Nessuna persona' description='Aggiungi la prima persona.' />
  }

  const adminSwitch = (row: AccessMatrixRow) => (
    <Switch
      aria-label={`Amministratore: ${row.profile.full_name}`}
      checked={isAdmin(row)}
      onCheckedChange={checked => changeAdmin(row, checked)}
      disabled={isLastAdminSelf(row)}
    />
  )

  const levelSelect = (row: AccessMatrixRow, feature: Feature) => (
    <LevelSelect
      value={isAdmin(row) ? 'admin' : levelOf(row, feature)}
      disabled={isAdmin(row)}
      onChange={level => changeLevel(row, feature, level)}
    />
  )

  if (isMobile) {
    return (
      <div className='space-y-4'>
        <MobileRowList>
          {rows.map((row, index) => (
            <MobileRow
              key={row.profile.id}
              index={index}
              title={row.profile.full_name}
              meta={[row.profile.email ?? 'Senza e-mail']}
              signal={row.profile.user_id === null ? <UnregisteredBadge /> : undefined}
              footer={
                <div className='space-y-2'>
                  <SettingRow label='Amministratore'>{adminSwitch(row)}</SettingRow>
                  {features.map(feature => (
                    <SettingRow key={feature.key} label={feature.name}>
                      {levelSelect(row, feature)}
                    </SettingRow>
                  ))}
                </div>
              }
            />
          ))}
        </MobileRowList>
        <p className='text-muted-foreground text-xs'>{countLabel}</p>
      </div>
    )
  }

  const columns: ColumnDef<AccessMatrixRow>[] = [
    {
      id: 'person',
      header: 'Persona',
      meta: { elastica: true },
      cell: ({ row }) => (
        <div className='min-w-0'>
          <div className='flex min-w-0 items-center gap-2'>
            <Person person={row.original.profile} size='xs' />
            {row.original.profile.user_id === null && <UnregisteredBadge />}
          </div>
          {row.original.profile.email && (
            <div className='text-muted-foreground truncate text-xs'>{row.original.profile.email}</div>
          )}
        </div>
      ),
    },
    {
      id: 'admin',
      header: 'Amministratore',
      cell: ({ row }) => adminSwitch(row.original),
    },
    ...features.map<ColumnDef<AccessMatrixRow>>(feature => ({
      id: `feature-${feature.key}`,
      header: feature.name,
      cell: ({ row }) => levelSelect(row.original, feature),
    })),
  ]

  return <DataTable data={rows} columns={columns} footer={countLabel} densita='media' />
}

function levelKey(row: AccessMatrixRow, feature: Feature) {
  return `${row.profile.id}:${feature.key}`
}

function LevelSelect({
  value,
  disabled,
  onChange,
}: {
  value: AccessLevel
  disabled?: boolean
  onChange: (level: AccessLevel) => void
}) {
  return (
    <Scelta
      size='sm'
      opzioni={LEVEL_OPTIONS}
      value={value}
      disabled={disabled}
      onValueChange={next => {
        const level = ACCESS_LEVELS.find(candidate => candidate === next)
        if (level) onChange(level)
      }}
    />
  )
}

function UnregisteredBadge() {
  return (
    <StatusBadge tone='muted' size='sm'>
      Non registrata
    </StatusBadge>
  )
}

function SettingRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className='flex items-center justify-between gap-3 text-sm'>
      <span>{label}</span>
      {children}
    </div>
  )
}
