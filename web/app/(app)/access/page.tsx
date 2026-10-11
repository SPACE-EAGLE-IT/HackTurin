import { AccessMatrix } from '@/components/access/access-matrix'
import { AddPersonButton } from '@/components/access/add-person-dialog'
import { Avviso } from '@/components/ds/avviso'
import PageHeader from '@/components/ds/page-header'
import { requirePageAccess } from '@/lib/access/guard'
import { listAccessMatrix } from '@/lib/access/queries'
import { getSession } from '@/lib/auth/session'

export default async function AccessPage() {
  await requirePageAccess('access', 'admin')
  const [{ features, rows }, session] = await Promise.all([listAccessMatrix(), getSession()])

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Accessi'
        description='Chi vede e chi modifica ogni sezione.'
        actions={<AddPersonButton />}
      />
      <Avviso tono='info' className='px-4 py-3 text-sm'>
        Nessuno: la sezione non compare · Lettura: vede · Scrittura: crea e modifica · Gestione: amministra la
        sezione.
      </Avviso>
      <AccessMatrix features={features} rows={rows} currentProfileId={session?.profile.id ?? null} />
    </div>
  )
}
