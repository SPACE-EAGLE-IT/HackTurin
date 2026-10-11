import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from 'ai'
import { z } from 'zod'

import { languageModel } from '@/lib/ai/provider'
import { citizenAiConfig, citizenPrompt, citizenTools } from '@/lib/cittadino/assistant'
import { todayKey } from '@/lib/date-keys'

export const maxDuration = 60

const MAX_MESSAGES = 24
const MAX_CHARS = 6000

const bodySchema = z.object({
  messages: z
    .array(z.custom<UIMessage>(value => typeof value === 'object' && value !== null && 'role' in value))
    .min(1)
    .max(MAX_MESSAGES),
})

// Per-instance limiter: anonymous chat must not become a free LLM proxy.
const hits = new Map<string, number[]>()
function limited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter(t => now - t < 10 * 60_000)
  recent.push(now)
  hits.set(ip, recent)
  return recent.length > 20
}

/** GET tells the widget whether the assistant is available, without revealing anything else. */
export function GET() {
  return Response.json({ available: citizenAiConfig() !== null })
}

/** The citizen chat: anonymous, read-only tools, streamed. Nothing is stored. */
export async function POST(req: Request) {
  const config = citizenAiConfig()
  if (!config) return Response.json({ error: 'Assistente non ancora attivo' }, { status: 503 })
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  if (limited(ip)) {
    return Response.json({ error: 'Hai scritto molti messaggi: riprova tra qualche minuto' }, { status: 429 })
  }
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return Response.json({ error: 'Richiesta non valida' }, { status: 400 })
  const { messages } = parsed.data
  let chars = 0
  for (const m of messages) for (const p of m.parts) if (p.type === 'text') chars += p.text.length
  if (chars > MAX_CHARS) {
    return Response.json({ error: 'La conversazione è lunga: ricominciane una' }, { status: 413 })
  }

  const result = streamText({
    model: languageModel(config),
    system: citizenPrompt(todayKey()),
    messages: await convertToModelMessages(messages),
    tools: citizenTools(),
    stopWhen: stepCountIs(5),
    maxOutputTokens: 700,
  })
  return result.toUIMessageStreamResponse({
    onError: () => 'L’assistente non risponde in questo momento. Riprova tra poco.',
  })
}
