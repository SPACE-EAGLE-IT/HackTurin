import type { Metadata } from 'next'

import PageHeader from '@/components/ds/page-header'
import { NoAccessState } from '@/components/shell/page-states'
import { NAVIGATION } from '@/lib/navigation'
import { firstParam, type SearchParams } from '@/lib/search-params'

export const metadata: Metadata = { title: 'Accesso non consentito' }

/** Where `requirePageAccess` sends people who hold `none` on a feature. */
export default async function ForbiddenPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams
  const feature = firstParam(params, 'feature')
  const entry = NAVIGATION.find(item => item.key === feature)

  return (
    <>
      <PageHeader title='Accesso non consentito' />
      <NoAccessState featureTitle={entry?.title} />
    </>
  )
}
