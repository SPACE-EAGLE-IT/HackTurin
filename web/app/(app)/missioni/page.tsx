import Link from 'next/link'

import PageHeader from '@/components/ds/page-header'
import { ListSurface } from '@/components/list-surface'
import { EnrolmentCard } from '@/components/missioni/enrolment-card'
import { MissionKpis } from '@/components/missioni/mission-kpis'
import { MissionTable } from '@/components/missioni/mission-table'
import { MissionTabs } from '@/components/missioni/mission-tabs'
import { NewMissionButton } from '@/components/missioni/new-mission-dialog'
import { Button } from '@/components/ui/button'
import { PARTNER_ETS } from '@/lib/payments/stripe'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { requireSession } from '@/lib/auth/session'
import { getMissionKpis, getVolunteerProfile, listMissions, listTeamOptions } from '@/lib/missioni/queries'
import { isEnrolled, MISSION_TABS } from '@/lib/missioni/types'
import { enumParam, type SearchParams } from '@/lib/search-params'

export default async function MissioniPage(props: { searchParams: Promise<SearchParams> }) {
  await requirePageAccess('missioni')
  const [params, session] = await Promise.all([props.searchParams, requireSession()])
  const [canWrite, isAdmin] = await Promise.all([can('missioni', 'write'), can('missioni', 'admin')])

  const requested = enumParam(params, 'tab', MISSION_TABS) ?? 'disponibili'
  const tab = requested === 'verifica' && !isAdmin ? 'disponibili' : requested
  const profileId = session.profile.id

  const [volunteer, kpis, missions, toReview, teams] = await Promise.all([
    getVolunteerProfile(profileId),
    getMissionKpis(profileId),
    listMissions(tab, profileId),
    isAdmin ? listMissions('verifica', profileId) : Promise.resolve([]),
    isAdmin ? listTeamOptions() : Promise.resolve([]),
  ])
  const enrolled = isEnrolled(volunteer)

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Missioni'
        description='Piccoli interventi di cura urbana: ore riconosciute, spese rimborsate, nessun compenso.'
        actions={
          <>
            {kpis.mineVerified > 0 && (
              <Button asChild variant='outline'>
                <Link href='/missioni/attestato'>Attestato ore</Link>
              </Button>
            )}
            {isAdmin && <NewMissionButton teams={teams} />}
          </>
        }
      />
      {canWrite && !enrolled && <EnrolmentCard ets={PARTNER_ETS} />}
      <MissionKpis kpis={kpis} tab={tab} />
      <ListSurface toolbar={<MissionTabs tab={tab} canReview={isAdmin} toReview={toReview.length} />}>
        <MissionTable missions={missions} tab={tab} canTake={canWrite && enrolled} />
      </ListSurface>
    </div>
  )
}
