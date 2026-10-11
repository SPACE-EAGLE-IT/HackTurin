import type { UIMessage } from 'ai'

import { createClient } from '@/lib/supabase/server'

import type { AiUsage, ConversationSummary } from './types'

/** The person's conversations, most recent first. */
export async function listConversations(limit = 20): Promise<ConversationSummary[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

/** The messages of a conversation as the chat renders them, or `null` when it is not the person's. */
export async function getConversationMessages(conversationId: string): Promise<UIMessage[] | null> {
  const supabase = await createClient()
  const conversation = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('id', conversationId)
    .maybeSingle()
  if (conversation.error) throw conversation.error
  if (!conversation.data) return null
  const { data, error } = await supabase
    .from('ai_messages')
    .select('id, role, parts')
    .eq('conversation_id', conversationId)
    .order('created_at')
  if (error) throw error
  return data.map(row => ({
    id: row.id,
    role: row.role as 'user' | 'assistant',
    parts: row.parts as unknown as UIMessage['parts'],
  }))
}

/** Calls of the current month: the person's own, or everyone's for an admin (RLS decides). */
export async function getAiUsage(): Promise<AiUsage> {
  const supabase = await createClient()
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const { data, error } = await supabase
    .from('ai_calls')
    .select('provider, model, input_tokens, output_tokens, created_at')
    .gte('created_at', monthStart.toISOString())
    .order('created_at', { ascending: false })
  if (error) throw error

  const byModel = new Map<string, AiUsage['byModel'][number]>()
  const usage: AiUsage = {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    lastCallAt: data[0]?.created_at ?? null,
    byModel: [],
  }
  for (const call of data) {
    usage.calls++
    usage.inputTokens += call.input_tokens
    usage.outputTokens += call.output_tokens
    const key = `${call.provider}/${call.model}`
    const entry = byModel.get(key) ?? {
      provider: call.provider,
      model: call.model,
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
    }
    entry.calls++
    entry.inputTokens += call.input_tokens
    entry.outputTokens += call.output_tokens
    byModel.set(key, entry)
  }
  usage.byModel = [...byModel.values()].sort((a, b) => b.calls - a.calls)
  return usage
}
