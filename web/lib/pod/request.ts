import { createHash } from 'node:crypto'

import { NextResponse } from 'next/server'

import { createAnonClient } from '@/lib/supabase/anon'
import type { Json } from '@/lib/supabase/database.types'

export const hashKey = (key: string) => createHash('sha256').update(key).digest('hex')

/** The POD request as the API sees it: the key hash is the credential, never the key itself. */
export async function readPodRequest(req: Request) {
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.get('authorization') ?? '')?.[1] ?? null
  const body: unknown = await req.json().catch(() => null)
  return {
    body,
    keyHash: token ? hashKey(token) : '',
    keyPrefix: token?.slice(0, 14) ?? null,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local',
    logBody: sanitize(body),
  }
}

/** Drops heavy fields (photos) and caps the size of what is logged. */
function sanitize(body: unknown): Json {
  if (!body || typeof body !== 'object') return null
  const copy: Record<string, unknown> = { ...(body as Record<string, unknown>) }
  if (typeof copy.photo_base64 === 'string') {
    copy.photo_base64 = `[foto ${Math.round((copy.photo_base64.length * 0.75) / 1024)} KB]`
  }
  const text = JSON.stringify(copy)
  return (text.length > 8000 ? { _truncated: true, preview: text.slice(0, 8000) } : copy) as Json
}

/** Logs a request rejected before reaching the database (invalid payload) and answers it. */
export async function rejectPod(
  pod: Awaited<ReturnType<typeof readPodRequest>>,
  endpoint: string,
  status: number,
  json: Record<string, unknown>
) {
  await createAnonClient().rpc('pod_log', {
    p_key_hash: pod.keyHash,
    p_key_prefix: pod.keyPrefix ?? '',
    p_endpoint: endpoint,
    p_status: status,
    p_body: pod.logBody,
    p_ip: pod.ip,
  })
  return NextResponse.json(json, { status })
}

/** Answers with the `{ status, body }` envelope returned by the pod_* functions. */
export function answer(result: Json | null) {
  const r = (result ?? {}) as { status?: number; body?: Json }
  return NextResponse.json(r.body ?? { error: 'server_error' }, { status: r.status ?? 500 })
}

export const zodDetails = (issues: { path: PropertyKey[]; message: string }[]) =>
  issues.map(i => ({ field: i.path.map(String).join('.'), message: i.message }))
