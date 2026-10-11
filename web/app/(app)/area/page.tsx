import { redirect } from 'next/navigation'

import { getAccess } from '@/lib/access/queries'
import { homeFor } from '@/lib/navigation'

/** Landing after sign-in: staff, volunteers and companies each start from their first section. */
export default async function AreaPage() {
  redirect(homeFor(await getAccess()))
}
