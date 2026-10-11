import { notFound } from 'next/navigation'

import { BackLink } from '@/components/ds/back-link'
import PageHeader from '@/components/ds/page-header'
import { MissionStatusBadge } from '@/components/missioni/mission-badges'
import { MissionExpenses } from '@/components/missioni/mission-expenses'
import { MissionFacts, MissionOutcome } from '@/components/missioni/mission-info'
import { MissionReviewActions } from '@/components/missioni/mission-review-actions'
import { MissionSubmitForm } from '@/components/missioni/mission-submit-form'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { requireSession } from '@/lib/auth/session'
import { categoryName } from '@/lib/civic/categories'
import { getMission, listExpenseUsage } from '@/lib/missioni/queries'
import { uuidSchema } from '@/lib/validation'

export default async function MissionPage(props: { params: Promise<{ missionId: string }> }) {
  await requirePageAccess('missioni')
  const { missionId } = await props.params
  if (!uuidSchema.safeParse(missionId).success) notFound()

  const session = await requireSession()
  const [mission, isAdmin, canWrite, usage] = await Promise.all([
    getMission(missionId),
    can('missioni', 'admin'),
    can('missioni', 'write'),
    listExpenseUsage(session.profile.id),
  ])
  if (!mission) notFound()

  const isVolunteer = canWrite && mission.volunteer_id === session.profile.id
  const canSubmit = isVolunteer && (mission.status === 'assigned' || mission.status === 'rejected')
  const meta = [
    mission.cap ? `CAP ${mission.cap}` : null,
    mission.category ? categoryName(mission.category) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className='space-y-6'>
      <BackLink href='/missioni'>Tutte le missioni</BackLink>
      <PageHeader
        title={mission.title}
        badges={<MissionStatusBadge status={mission.status} />}
        meta={meta ? <span className='text-muted-foreground text-sm'>{meta}</span> : undefined}
        actions={
          isAdmin && mission.status === 'submitted' ? (
            <MissionReviewActions missionId={mission.id} />
          ) : undefined
        }
      />
      <div className='grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]'>
        <div className='space-y-6'>
          <MissionOutcome mission={mission} />
          {canSubmit && (
            <MissionSubmitForm
              missionId={mission.id}
              hours={mission.hours !== null ? Number(mission.hours) : null}
              kg={mission.kg_collected !== null ? Number(mission.kg_collected) : null}
              note={mission.volunteer_note}
              hasAfterPhoto={Boolean(mission.photo_after_url)}
            />
          )}
          <MissionExpenses
            missionId={mission.id}
            expenses={mission.expenses}
            usage={usage}
            canAdd={isVolunteer && mission.status !== 'open'}
          />
        </div>
        <MissionFacts mission={mission} />
      </div>
    </div>
  )
}
