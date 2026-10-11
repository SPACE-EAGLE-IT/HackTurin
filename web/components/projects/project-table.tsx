'use client'

import type { ColumnDef } from '@tanstack/react-table'
import { FolderKanbanIcon } from 'lucide-react'

import { Data } from '@/components/ds/data'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MeterRow } from '@/components/ds/meter-row'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { Person } from '@/components/people/person-ref'
import { ProjectStatusBadge } from '@/components/projects/project-status-badge'
import { useIsMobile } from '@/hooks/use-mobile'
import { completionPercent, type ProjectListItem } from '@/lib/projects/types'

const columns: ColumnDef<ProjectListItem>[] = [
  {
    accessorKey: 'code',
    header: 'Codice',
    cell: ({ row }) => <span className='tabular-nums'>{row.original.code}</span>,
  },
  {
    accessorKey: 'name',
    header: 'Nome',
    meta: { elastica: true },
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='truncate font-medium'>{row.original.name}</div>
        {row.original.client_name && (
          <div className='text-muted-foreground truncate text-xs'>{row.original.client_name}</div>
        )}
      </div>
    ),
  },
  {
    id: 'owner',
    header: 'Responsabile',
    cell: ({ row }) => <Person person={row.original.owner} size='xs' emptyLabel='Nessuno' />,
  },
  {
    accessorKey: 'status',
    header: 'Stato',
    cell: ({ row }) => <ProjectStatusBadge status={row.original.status} />,
  },
  {
    id: 'progress',
    header: 'Avanzamento',
    cell: ({ row }) => {
      const { progress } = row.original
      const pct = completionPercent(progress)
      return (
        <MeterRow
          label={`${pct}%`}
          value={`${progress.tasksDone}/${progress.tasksTotal}`}
          pct={pct}
          height='sm'
          fillClassName='bg-success'
        />
      )
    },
  },
  {
    accessorKey: 'due_date',
    header: 'Scadenza',
    cell: ({ row }) => <Data valore={row.original.due_date} forma='corta' />,
  },
]

export function ProjectTable({
  projects,
  cornice = true,
}: {
  projects: ProjectListItem[]
  /** False inside a `ListSurface`, which already draws the card. */
  cornice?: boolean
}) {
  const isMobile = useIsMobile()

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderKanbanIcon}
        title='Nessun appalto'
        description='Crea il primo appalto di zona o cambia i filtri.'
      />
    )
  }

  if (isMobile) {
    return (
      <MobileRowList>
        {projects.map((project, index) => (
          <MobileRow
            key={project.id}
            index={index}
            title={project.name}
            meta={[project.code, project.client_name].filter((item): item is string => Boolean(item))}
            signal={<ProjectStatusBadge status={project.status} size='sm' />}
            href={`/projects/${project.id}`}
          />
        ))}
      </MobileRowList>
    )
  }

  return (
    <DataTable
      data={projects}
      columns={columns}
      rowHref={project => `/projects/${project.id}`}
      footer={({ rese, totali }) => `${rese} di ${totali} appalti`}
      densita='media'
      cornice={cornice}
    />
  )
}
