'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/ds/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { rejectMission, verifyMission } from '@/lib/missioni/actions'

/** Header actions of a submitted mission for mission admins: «Respingi» with a reason, «Verifica» primary. */
export function MissionReviewActions({ missionId }: { missionId: string }) {
  const router = useRouter()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const verify = () =>
    startTransition(async () => {
      const result = await verifyMission(missionId)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success('Missione verificata')
      router.refresh()
    })

  const reject = async (reason: string) => {
    const result = await rejectMission({ id: missionId, reason })
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success('Missione respinta')
    setRejectOpen(false)
    router.refresh()
  }

  return (
    <>
      <Button variant='outline' onClick={() => setRejectOpen(true)} disabled={pending}>
        <XIcon /> Respingi
      </Button>
      <Button onClick={verify} disabled={pending}>
        {pending ? <Spinner /> : <CheckIcon />} Verifica
      </Button>
      <ConfirmDialog
        open={rejectOpen}
        title='Respingere la missione?'
        description='Il volontario vede il motivo e può inviare di nuovo l’esito.'
        confirmLabel='Respingi'
        tone='destructive'
        motivo={{ label: 'Motivo', placeholder: 'Cosa manca o va corretto' }}
        onConfirm={reject}
        onClose={() => setRejectOpen(false)}
      />
    </>
  )
}
