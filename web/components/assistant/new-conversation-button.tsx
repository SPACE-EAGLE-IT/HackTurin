'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { createConversation } from '@/lib/ai/actions'

/** The primary of `/assistant`: creates a conversation and opens it. */
export function NewConversationButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const create = () =>
    startTransition(async () => {
      const result = await createConversation()
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      router.push(`/assistant?c=${result.data.id}`)
    })

  return (
    <Button onClick={create} disabled={pending}>
      {pending ? <Spinner /> : <PlusIcon />}
      Nuova conversazione
    </Button>
  )
}
