'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ColumnDef } from '@tanstack/react-table'
import { HandHeartIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Data } from '@/components/ds/data'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { MissionStatusBadge } from '@/components/missioni/mission-badges'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useIsMobile } from '@/hooks/use-mobile'
import { categoryName } from '@/lib/civic/categories'
import { takeMission } from '@/lib/missioni/actions'
import type { MissionListItem, MissionTab } from '@/lib/missioni/types'

const missionHref = (mission: MissionListItem) => `/missioni/${mission.id}`

const EMPTY: Record<MissionTab, { title: string; description: string }> = {
  disponibili: { title: 'Nessuna missione disponibile', description: 'Le nuove missioni compaiono qui.' },
  mie: { title: 'Nessuna missione presa', description: 'Prendi una missione dalla scheda Disponibili.' },
  verifica: { title: 'Nessuna missione da verificare', description: 'Le missioni inviate compaiono qui.' },
}

export function MissionTable({
  missions,
  tab,
  canTake,
}: {
  missions: MissionListItem[]
  tab: MissionTab
  /** The current user is enrolled and may take open missions. */
  canTake: boolean
}) {
  const isMobile = useIsMobile()
  const router = useRouter()
  const [takingId, setTakingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const take = (id: string) => {
    setTakingId(id)
    startTransition(async () => {
      const result = await takeMission(id)
      setTakingId(null)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success('Missione presa')
      router.push(`/missioni/${id}`)
    })
  }

  const showTake = tab === 'disponibili' && canTake
  const columns = useMemo(() => buildColumns(tab, showTake, takingId, take), [tab, showTake, takingId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (missions.length === 0) {
    return <EmptyState icon={HandHeartIcon} title={EMPTY[tab].title} description={EMPTY[tab].description} />
  }

  if (isMobile) {
    return (
      <MobileRowList>
        {missions.map((mission, index) => (
          <MobileRow
            key={mission.id}
            index={index}
            href={missionHref(mission)}
            title={mission.title}
            meta={[
              mission.cap ? `CAP ${mission.cap}` : null,
              mission.category ? categoryName(mission.category) : null,
              mission.due_date ? <Data key='due' valore={mission.due_date} forma='corta' /> : null,
            ]}
            signal={<MissionStatusBadge status={mission.status} size='sm' />}
            footer={
              showTake ? (
                <TakeButton pending={takingId === mission.id} onClick={() => take(mission.id)} />
              ) : undefined
            }
          />
        ))}
      </MobileRowList>
    )
  }

  return (
    <DataTable
      data={missions}
      columns={columns}
      rowHref={missionHref}
      rowLabel={mission => mission.title}
      footer={({ rese, totali }) => `${rese} di ${totali} missioni`}
      densita='media'
      cornice={false}
    />
  )
}

function TakeButton({ pending, onClick }: { pending: boolean; onClick: () => void }) {
  return (
    <Button variant='outline' size='sm' onClick={onClick} disabled={pending}>
      {pending && <Spinner />} Prendi
    </Button>
  )
}

function buildColumns(
  tab: MissionTab,
  showTake: boolean,
  takingId: string | null,
  take: (id: string) => void
): ColumnDef<MissionListItem>[] {
  const columns: ColumnDef<MissionListItem>[] = [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Missione',
      cell: ({ row }) => <span className='font-medium'>{row.original.title}</span>,
    },
    {
      id: 'cap',
      accessorFn: mission => mission.cap ?? '',
      header: 'CAP',
      cell: ({ row }) => row.original.cap ?? <span className='text-muted-foreground'>—</span>,
    },
    {
      id: 'category',
      accessorFn: mission => (mission.category ? categoryName(mission.category) : ''),
      header: 'Categoria',
      cell: ({ row }) =>
        row.original.category ? (
          categoryName(row.original.category)
        ) : (
          <span className='text-muted-foreground'>—</span>
        ),
    },
  ]
  if (tab === 'verifica') {
    columns.push({
      id: 'volunteer',
      accessorFn: mission => mission.volunteer?.full_name ?? '',
      header: 'Volontario',
      cell: ({ row }) => row.original.volunteer?.full_name ?? '—',
    })
  }
  if (tab !== 'disponibili') {
    columns.push({
      id: 'status',
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => <MissionStatusBadge status={row.original.status} />,
    })
  }
  columns.push({
    id: 'due',
    accessorKey: 'due_date',
    header: 'Scadenza',
    cell: ({ row }) =>
      row.original.due_date ? (
        <Data valore={row.original.due_date} forma='corta' />
      ) : (
        <span className='text-muted-foreground'>—</span>
      ),
  })
  if (showTake) {
    columns.push({
      id: 'take',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className='flex justify-end'>
          <TakeButton pending={takingId === row.original.id} onClick={() => take(row.original.id)} />
        </div>
      ),
    })
  }
  return columns
}
