'use client'

import { useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { SquareCheckBigIcon } from 'lucide-react'

import { Data } from '@/components/ds/data'
import { DataTable } from '@/components/ds/data-table'
import { EmptyState } from '@/components/ds/empty-state'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import { TagChip } from '@/components/ds/tag-chip'
import { Person } from '@/components/people/person-ref'
import { TaskPriorityBadge, TaskStatusBadge } from '@/components/tasks/task-badges'
import { useIsMobile } from '@/hooks/use-mobile'
import { todayKey } from '@/lib/date-keys'
import { isOverdue, type TaskListItem } from '@/lib/tasks/types'

const taskHref = (task: TaskListItem) => `/tasks/${task.id}`

export function TaskTable({
  tasks,
  hideProject,
  emptyTitle,
  cornice = true,
}: {
  /** False inside a `ListSurface`, which already draws the card. */
  cornice?: boolean
  tasks: TaskListItem[]
  hideProject?: boolean
  emptyTitle?: string
}) {
  const isMobile = useIsMobile()
  const [today] = useState(todayKey)
  const columns = useMemo(() => buildColumns(today, hideProject === true), [today, hideProject])

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={SquareCheckBigIcon}
        title={emptyTitle ?? 'Nessun intervento'}
        description='Crea un intervento da una segnalazione o cambia i filtri.'
      />
    )
  }

  if (isMobile) {
    return (
      <MobileRowList>
        {tasks.map((task, index) => (
          <MobileRow
            key={task.id}
            index={index}
            href={taskHref(task)}
            title={task.title}
            meta={[
              task.project?.code,
              task.due_date ? <DueDate key='due' task={task} today={today} /> : null,
            ]}
            leading={task.assignee ? <Person person={task.assignee} size='xs' /> : undefined}
            signal={<TaskStatusBadge status={task.status} size='sm' />}
          />
        ))}
      </MobileRowList>
    )
  }

  return (
    <DataTable
      data={tasks}
      columns={columns}
      rowHref={taskHref}
      rowLabel={task => task.title}
      footer={({ rese, totali }) => `${rese} di ${totali} task`}
      densita='media'
      cornice={cornice}
    />
  )
}

function DueDate({ task, today }: { task: TaskListItem; today: string }) {
  if (!task.due_date) return <span className='text-muted-foreground'>—</span>
  return (
    <Data
      valore={task.due_date}
      forma='corta'
      className={isOverdue(task, today) ? 'text-destructive' : undefined}
    />
  )
}

function buildColumns(today: string, hideProject: boolean): ColumnDef<TaskListItem>[] {
  const columns: ColumnDef<TaskListItem>[] = [
    {
      id: 'title',
      accessorKey: 'title',
      header: 'Titolo',
      cell: ({ row }) => (
        <div className='flex min-w-0 flex-wrap items-center gap-1.5'>
          <span className='font-medium'>{row.original.title}</span>
          {row.original.tags.map(tag => (
            <TagChip key={tag} tag={tag} />
          ))}
        </div>
      ),
    },
  ]

  if (!hideProject) {
    columns.push({
      id: 'project',
      accessorFn: task => task.project?.code ?? '',
      header: 'Appalto',
      cell: ({ row }) =>
        row.original.project ? (
          <span>
            {row.original.project.code}{' '}
            <span className='text-muted-foreground'>{row.original.project.name}</span>
          </span>
        ) : (
          <span className='text-muted-foreground'>—</span>
        ),
    })
  }

  columns.push(
    {
      id: 'assignee',
      accessorFn: task => task.assignee?.full_name ?? '',
      header: 'Assegnata a',
      cell: ({ row }) => <Person person={row.original.assignee} size='xs' />,
    },
    {
      id: 'priority',
      accessorKey: 'priority',
      header: 'Priorità',
      cell: ({ row }) => <TaskPriorityBadge priority={row.original.priority} />,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Stato',
      cell: ({ row }) => <TaskStatusBadge status={row.original.status} />,
    },
    {
      id: 'due',
      accessorKey: 'due_date',
      header: 'Scadenza',
      cell: ({ row }) => <DueDate task={row.original} today={today} />,
    }
  )

  return columns
}
