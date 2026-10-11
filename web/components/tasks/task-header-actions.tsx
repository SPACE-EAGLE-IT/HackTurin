'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, RotateCcwIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ds/confirm-dialog'
import { MenuAzioni } from '@/components/ds/menu-azioni'
import { Button } from '@/components/ui/button'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { deleteTask, updateTask } from '@/lib/tasks/actions'
import type { TaskStatus } from '@/lib/tasks/types'

/** The actions of the detail header: the menu with «Elimina» and the one primary, done/reopen. */
export function TaskHeaderActions({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const done = status === 'done'

  const toggleDone = () =>
    startTransition(async () => {
      const result = await updateTask(taskId, { status: done ? 'todo' : 'done' })
      if (!result.ok) toast.error(result.message)
      else toast.success(done ? 'Task riaperta' : 'Task completata')
    })

  const remove = async () => {
    const result = await deleteTask(taskId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('Task eliminata')
    router.push('/tasks')
  }

  return (
    <>
      <MenuAzioni etichetta='Altre azioni'>
        <DropdownMenuItem variant='destructive' onSelect={() => setConfirmOpen(true)}>
          <Trash2Icon /> Elimina
        </DropdownMenuItem>
      </MenuAzioni>
      <Button onClick={toggleDone} disabled={pending}>
        {pending ? <Spinner /> : done ? <RotateCcwIcon /> : <CheckIcon />}
        {done ? 'Riapri' : 'Segna come fatta'}
      </Button>
      <ConfirmDialog
        open={confirmOpen}
        title='Eliminare la task?'
        description='La task e i suoi commenti spariscono. Non si può annullare.'
        confirmLabel='Elimina'
        tone='destructive'
        onConfirm={remove}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  )
}
