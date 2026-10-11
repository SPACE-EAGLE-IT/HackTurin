import { PublicMapView } from '@/components/civic/public-map-view'
import { publicReports } from '@/lib/public/queries'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  return <PublicMapView initial={await publicReports().catch(() => [])} />
}
