'use client'

import { Trash2Icon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ds/confirm-dialog'
import { MenuAzioni } from '@/components/ds/menu-azioni'
import { DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { deleteProject } from '@/lib/projects/actions'

export function ProjectActions({ projectId }: { projectId: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)

  // ConfirmDialog awaits the promise, shows its own pending state and closes when it resolves.
  async function onConfirm() {
    const result = await deleteProject(projectId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('Appalto eliminato')
    router.push('/projects')
  }

  return (
    <>
      <MenuAzioni etichetta='Altre azioni'>
        <DropdownMenuItem variant='destructive' onSelect={() => setConfirming(true)}>
          <Trash2Icon /> Elimina appalto
        </DropdownMenuItem>
      </MenuAzioni>
      <ConfirmDialog
        open={confirming}
        title='Elimina appalto'
        description='Gli interventi restano, senza appalto.'
        confirmLabel='Elimina'
        tone='destructive'
        onConfirm={onConfirm}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}
