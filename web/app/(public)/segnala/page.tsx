import PageHeader from '@/components/ds/page-header'
import { ReportForm } from '@/components/civic/report-form'

export const metadata = { title: 'Segnala' }

export default function SegnalaPage() {
  return (
    <div className='mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6'>
      <PageHeader title='Segnala un problema' description='Venti secondi, nessuna registrazione.' />
      <ReportForm />
    </div>
  )
}
