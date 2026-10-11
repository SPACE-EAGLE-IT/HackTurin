'use client'

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { MissionTab } from '@/lib/missioni/types'
import { useUrlState } from '@/lib/url-state'

/** Areas of the module, state in `?tab=`; «Da verificare» only for mission admins. */
export function MissionTabs({
  tab,
  canReview,
  toReview,
}: {
  tab: MissionTab
  canReview: boolean
  toReview: number
}) {
  const { set } = useUrlState()
  return (
    <Tabs value={tab} onValueChange={value => set('tab', value === 'disponibili' ? null : value)}>
      <TabsList variant='line'>
        <TabsTrigger value='disponibili'>Disponibili</TabsTrigger>
        <TabsTrigger value='mie'>Le mie</TabsTrigger>
        {canReview && <TabsTrigger value='verifica'>Da verificare ({toReview})</TabsTrigger>}
      </TabsList>
    </Tabs>
  )
}
