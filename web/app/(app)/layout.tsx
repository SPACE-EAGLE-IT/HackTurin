import type { ReactNode } from 'react'

import { initialsOf } from '@/components/people/person-ref'
import { Shell } from '@/components/shell/shell'
import { getAccess } from '@/lib/access/queries'
import { assistantExamples } from '@/lib/ai/modules'
import { getAiStatus } from '@/lib/ai/settings'
import { requireSession } from '@/lib/auth/session'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await requireSession()
  const [access, aiStatus] = await Promise.all([getAccess(), getAiStatus()])
  const name = session.profile.full_name

  return (
    <Shell
      user={{ name, email: session.email, initials: initialsOf(name), isAdmin: session.profile.is_admin }}
      access={access}
      assistant={{ configured: aiStatus.configured, examples: assistantExamples() }}
    >
      {children}
    </Shell>
  )
}
