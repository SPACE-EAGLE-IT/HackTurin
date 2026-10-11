import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AssistantChat } from '@/components/assistant/assistant-chat'
import { NewConversationButton } from '@/components/assistant/new-conversation-button'
import { Data } from '@/components/ds/data'
import { EmptyState } from '@/components/ds/empty-state'
import { MobileRow, MobileRowList } from '@/components/ds/mobile-row'
import PageHeader from '@/components/ds/page-header'
import { SectionCard } from '@/components/ds/section-card'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { requirePageAccess } from '@/lib/access/guard'
import { assistantExamples } from '@/lib/ai/modules'
import { getConversationMessages, listConversations } from '@/lib/ai/queries'
import { getAiStatus } from '@/lib/ai/settings'
import { requireSession } from '@/lib/auth/session'
import { firstParam, type SearchParams } from '@/lib/search-params'
import { cn } from '@/lib/utils'
import { uuidSchema } from '@/lib/validation'

const GRID = 'grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]'

export default async function AssistantPage(props: { searchParams: Promise<SearchParams> }) {
  await requirePageAccess('ai')
  const params = await props.searchParams
  const current = firstParam(params, 'c')
  // A malformed id is "not found", not a database error.
  if (current !== undefined && !uuidSchema.safeParse(current).success) notFound()

  const [conversations, status, session, messages] = await Promise.all([
    listConversations(),
    getAiStatus(),
    requireSession(),
    current ? getConversationMessages(current) : Promise.resolve(null),
  ])
  if (current && !messages) notFound()

  const isAdmin = session.profile.is_admin

  return (
    <div className='space-y-6'>
      <PageHeader
        title='Assistente'
        description='Chiedi ai tuoi dati, conferma le proposte.'
        actions={
          <>
            {isAdmin && (
              <Button variant='outline' asChild>
                <Link href='/assistant/setup'>Configurazione</Link>
              </Button>
            )}
            <NewConversationButton />
          </>
        }
      />
      <div className={GRID}>
        <SectionCard title='Conversazioni'>
          {conversations.length === 0 ? (
            <EmptyState compatto testo='Nessuna conversazione' />
          ) : (
            <MobileRowList piatta>
              {conversations.map((conversation, index) => (
                <MobileRow
                  key={conversation.id}
                  index={index}
                  piatta
                  href={`/assistant?c=${conversation.id}`}
                  title={conversation.title}
                  meta={[<Data key='updated' valore={conversation.updated_at} forma='eta' />]}
                  className={cn('rounded-md', conversation.id === current && 'bg-muted')}
                />
              ))}
            </MobileRowList>
          )}
        </SectionCard>
        {current && messages ? (
          <Card className='overflow-hidden p-0'>
            <AssistantChat
              conversationId={current}
              initialMessages={messages}
              configured={status.configured}
              isAdmin={isAdmin}
              examples={assistantExamples()}
              variant='page'
            />
          </Card>
        ) : (
          <EmptyState
            title='Nessuna conversazione aperta'
            description='Aprine una dall’elenco o inizia da capo.'
          />
        )}
      </div>
    </div>
  )
}
