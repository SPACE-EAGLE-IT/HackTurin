'use client'

import { useCallback, useMemo, useRef, useState, useTransition, type KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  CalendarIcon,
  FolderKanbanIcon,
  SignalHighIcon,
  SignalMediumIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ReactNode } from 'react'

import {
  BoardColumnShell,
  BoardDragPreview,
  BoardEmptyDrop,
  BoardScroller,
  TestaCardBoard,
  useBoardCollision,
  useBoardColumns,
  useBoardSensors,
} from '@/components/ds/board-frame'
import { Data } from '@/components/ds/data'
import { shortNameOf } from '@/components/people/person-ref'
import { Card } from '@/components/ui/card'
import { todayKey } from '@/lib/date-keys'
import { moveTask } from '@/lib/tasks/actions'
import {
  isOverdue,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUSES,
  type TaskListItem,
  type TaskPriority,
  type TaskStatus,
} from '@/lib/tasks/types'
import { cn } from '@/lib/utils'

/** What a drop target tells the board: the column it belongs to and, for a card, which task it is. */
type DropData = { status: TaskStatus; taskId?: string }

type Columns = Record<string, string[]>

/** Groups task ids by status, in board order (position first, then the list order). */
function buildColumns(tasks: TaskListItem[]): Columns {
  const columns: Columns = Object.fromEntries(TASK_STATUSES.map(status => [status, []]))
  const sorted = [...tasks].sort((a, b) => a.position - b.position)
  for (const task of sorted) columns[task.status].push(task.id)
  return columns
}

export function TaskBoard({ tasks, canWrite = true }: { tasks: TaskListItem[]; canWrite?: boolean }) {
  const router = useRouter()
  const [today] = useState(todayKey)
  const sensors = useBoardSensors()
  const collision = useBoardCollision()
  const { columns, setColumns, draggingRef, resync } = useBoardColumns(tasks, buildColumns)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  // A drag ends with a click on the same card: the click must not open the detail.
  const suppressClick = useRef(false)

  const byId = useMemo(() => new Map(tasks.map(task => [task.id, task] as const)), [tasks])
  const activeTask = activeId ? (byId.get(activeId) ?? null) : null

  const open = useCallback(
    (href: string) => {
      if (!suppressClick.current) router.push(href)
    },
    [router]
  )

  const onDragStart = (event: DragStartEvent) => {
    draggingRef.current = true
    setActiveId(String(event.active.id))
  }

  const onDragCancel = () => {
    draggingRef.current = false
    setActiveId(null)
  }

  const onDragEnd = (event: DragEndEvent) => {
    draggingRef.current = false
    setActiveId(null)
    suppressClick.current = true
    setTimeout(() => {
      suppressClick.current = false
    }, 0)

    const { active, over } = event
    if (!over) return
    const id = String(active.id)
    const target = over.data.current as DropData | undefined
    if (!target || target.taskId === id) return
    const from = TASK_STATUSES.find(status => columns[status]?.includes(id))
    if (!from) return
    const to = target.status

    const next: Columns = { ...columns, [from]: columns[from].filter(taskId => taskId !== id) }
    const destination = from === to ? next[from] : [...columns[to]]
    const at = target.taskId ? destination.indexOf(target.taskId) : -1
    destination.splice(at < 0 ? destination.length : at, 0, id)
    next[to] = destination
    if (from === to && destination.join() === columns[to].join()) return

    setColumns(next)
    startTransition(async () => {
      const result = await moveTask({ id, status: to, orderedIds: destination })
      if (!result.ok) {
        toast.error(result.message)
        resync()
      }
    })
  }

  return (
    <DndContext
      id='task-board'
      sensors={sensors}
      collisionDetection={collision}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      <BoardScroller dragging={activeId !== null}>
        {TASK_STATUSES.map(status => (
          <BoardColumn
            key={status}
            status={status}
            ids={columns[status] ?? []}
            byId={byId}
            today={today}
            canWrite={canWrite}
            onOpen={open}
          />
        ))}
      </BoardScroller>
      <DragOverlay>
        {activeTask && (
          <BoardDragPreview>
            <Card className={cn(CARD, 'rotate-1 shadow-lg')}>
              <TaskCardBody task={activeTask} today={today} />
            </Card>
          </BoardDragPreview>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function BoardColumn({
  status,
  ids,
  byId,
  today,
  canWrite,
  onOpen,
}: {
  status: TaskStatus
  ids: string[]
  byId: Map<string, TaskListItem>
  today: string
  canWrite: boolean
  onOpen: (href: string) => void
}) {
  const data: DropData = { status }
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}`, data })

  return (
    <BoardColumnShell
      title={TASK_STATUS_LABEL[status]}
      count={ids.length}
      isOver={isOver}
      innerRef={setNodeRef}
    >
      {ids.length === 0 ? (
        <BoardEmptyDrop />
      ) : (
        ids.map(id => {
          const task = byId.get(id)
          return task ? (
            <TaskCard
              key={id}
              task={task}
              column={status}
              today={today}
              canWrite={canWrite}
              onOpen={onOpen}
            />
          ) : null
        })
      )}
    </BoardColumnShell>
  )
}

const CARD = 'gap-2 p-3 transition-colors select-none hover:bg-muted/50'
const OVERDUE = 'border-destructive/40 bg-destructive/5 hover:bg-destructive/10'

function TaskCard({
  task,
  column,
  today,
  canWrite,
  onOpen,
}: {
  task: TaskListItem
  column: TaskStatus
  today: string
  canWrite: boolean
  onOpen: (href: string) => void
}) {
  const href = `/tasks/${task.id}`
  // The column comes from the board, not from the task: after an optimistic move the task is stale.
  const data: DropData = { status: column, taskId: task.id }
  const drag = useDraggable({ id: task.id, disabled: !canWrite })
  const drop = useDroppable({ id: `card:${task.id}`, data })
  const { setNodeRef: setDragRef } = drag
  const { setNodeRef: setDropRef } = drop
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      setDragRef(node)
      setDropRef(node)
    },
    [setDragRef, setDropRef]
  )

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') onOpen(href)
  }

  return (
    <Card
      ref={setRef}
      {...drag.attributes}
      {...drag.listeners}
      aria-label={task.title}
      data-overdue={isOverdue(task, today) ? '' : undefined}
      onClick={() => onOpen(href)}
      onKeyDown={onKeyDown}
      className={cn(
        CARD,
        isOverdue(task, today) && OVERDUE,
        canWrite ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
        drag.isDragging && 'opacity-50'
      )}
    >
      <TaskCardBody task={task} today={today} />
    </Card>
  )
}

const PRIORITY_GLYPH: Partial<Record<TaskPriority, { icon: LucideIcon; className: string }>> = {
  high: { icon: SignalHighIcon, className: 'text-destructive' },
  medium: { icon: SignalMediumIcon, className: 'text-info' },
}

/** The head of the card from the board frame, then one row per property: an icon, a short text. */
function TaskCardBody({ task, today }: { task: TaskListItem; today: string }) {
  const glyph = task.status === 'done' ? undefined : PRIORITY_GLYPH[task.priority]
  const overdue = isOverdue(task, today)
  const dueToday = task.status !== 'done' && task.due_date === today
  return (
    <>
      <TestaCardBoard
        titolo={task.title}
        barrato={task.status === 'done'}
        glifi={
          glyph && (
            <glyph.icon
              className={cn('size-3.5 shrink-0', glyph.className)}
              aria-label={`Priorità ${TASK_PRIORITY_LABEL[task.priority].toLowerCase()}`}
            />
          )
        }
      />
      <div className='space-y-0.5'>
        {task.project && (
          <CardRow
            icon={FolderKanbanIcon}
            label='Appalto'
            title={`${task.project.code} · ${task.project.name}`}
          >
            <span className='min-w-0 truncate'>
              {task.project.code} · {task.project.name}
            </span>
          </CardRow>
        )}
        {task.due_date && (
          <CardRow
            icon={CalendarIcon}
            label='Scadenza'
            className={cn(overdue && 'text-destructive font-medium', dueToday && 'text-warning font-medium')}
          >
            <Data valore={task.due_date} forma='corta' className='tabular-nums' />
          </CardRow>
        )}
        {task.assignee && (
          <CardRow icon={UserIcon} label='Responsabile' title={task.assignee.full_name}>
            <span className='min-w-0 truncate'>{shortNameOf(task.assignee.full_name)}</span>
          </CardRow>
        )}
      </div>
    </>
  )
}

function CardRow({
  icon: Icon,
  label,
  title,
  className,
  children,
}: {
  icon: LucideIcon
  label: string
  title?: string
  className?: string
  children: ReactNode
}) {
  return (
    <p
      className={cn('text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs', className)}
      title={title}
    >
      <Icon className='size-3 shrink-0' aria-hidden />
      <span className='sr-only'>{label}: </span>
      {children}
    </p>
  )
}
