import PageHeader from '@/components/ds/page-header'
import { ReportForm } from '@/components/civic/report-form'
import { VoiceLine } from '@/components/civic/voice-line'

export const metadata = { title: 'Segnala' }

export default function SegnalaPage() {
  // Public ids, not secrets: the voice block appears only once the ElevenLabs agent exists.
  const agentId = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID
  const phone = process.env.NEXT_PUBLIC_VOICE_NUMBER
  return (
    <div className='mx-auto w-full max-w-3xl space-y-6 p-4 md:p-6'>
      <PageHeader title='Segnala un problema' description='Venti secondi, nessuna registrazione.' />
      {agentId && <VoiceLine agentId={agentId} phone={phone || undefined} />}
      <ReportForm />
    </div>
  )
}
