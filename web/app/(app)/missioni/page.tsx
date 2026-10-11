import { Avviso } from '@/components/ds/avviso'
import PageHeader from '@/components/ds/page-header'
import { ListSurface } from '@/components/list-surface'
import { EnrolmentCard } from '@/components/missioni/enrolment-card'
import { MissionKpis } from '@/components/missioni/mission-kpis'
import { MissionTable } from '@/components/missioni/mission-table'
import { MissionTabs } from '@/components/missioni/mission-tabs'
import { NewMissionButton } from '@/components/missioni/new-mission-dialog'
import { requirePageAccess } from '@/lib/access/guard'
import { can } from '@/lib/access/queries'
import { requireSession } from '@/lib/auth/session'
import { getMissionKpis, getVolunteerProfile, listMissions } from '@/lib/missioni/queries'
import { isEnrolled, MISSION_TABS } from '@/lib/missioni/types'
import { enumParam, type SearchParams } from '@/lib/search-params'

export default async function MissioniPage(props: { searchParams: Promise<SearchParams> }) {
  await requirePageAccess('missioni')
  const [params, session] = await Promise.all([props.searchParams, requireSession()])
  const [canWrite, isAdmin] = await Promise.all([can('missioni', 'write'), can('missioni', 'admin')])

  const requested = enumParam(params, 'tab', MISSION_TABS) ?? 'disponibili'
  const tab = requested === 'verifica' && !isAdmin ? 'disponibili' : requested
  const profileId = session.profile.id

  const [volunteer, kpis, missions, toReview] = await Promise.all([
    getVolunteerProfile(profileId),
    getMissionKpis(profileId),
    listMissions(tab, profileId),
    isAdmin ? listMissions('verifica', profileId) : Promise.resolve([]),
  ])
  const enrolled = isEnrolled(volunteer)

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Missioni'
        description='Piccoli interventi di cura urbana, con rimborso delle sole spese sostenute.'
        actions={isAdmin ? <NewMissionButton /> : undefined}
      />
      {canWrite && !enrolled && (
        <>
          <Avviso tono='info'>
            Per prendere una missione serve l’iscrizione all’associazione partner con l’assicurazione dei
            volontari. Il volontariato non è retribuito: si rimborsano solo le spese.
          </Avviso>
          <EnrolmentCard
            member={Boolean(volunteer?.ets_member_at)}
            insured={volunteer?.insured ?? false}
            pattoRef={volunteer?.patto_ref ?? null}
          />
        </>
      )}
      <MissionKpis kpis={kpis} tab={tab} />
      <ListSurface toolbar={<MissionTabs tab={tab} canReview={isAdmin} toReview={toReview.length} />}>
        <MissionTable missions={missions} tab={tab} canTake={canWrite && enrolled} />
      </ListSurface>
    </div>
  )
}
