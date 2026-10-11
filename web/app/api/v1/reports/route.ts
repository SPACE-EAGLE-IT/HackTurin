import { z } from 'zod'

import { TORINO_BOUNDS as B } from '@/lib/civic/categories'
import { answer, readPodRequest, rejectPod, zodDetails } from '@/lib/pod/request'
import { createAnonClient } from '@/lib/supabase/anon'
import type { Json } from '@/lib/supabase/database.types'

const schema = z.object({
  category: z.string().min(1),
  lat: z.number().min(B.minLat).max(B.maxLat),
  lon: z.number().min(B.minLon).max(B.maxLon),
  confidence: z.number().min(0).max(1).default(1),
  captured_at: z.string().datetime().optional(),
  description: z.string().max(500).optional(),
  photo_base64: z.string().max(7_000_000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

/** A POD reports a problem. Contract: docs/POD_API.md. */
export async function POST(req: Request) {
  const pod = await readPodRequest(req)
  if (!pod.keyHash) return rejectPod(pod, 'reports', 401, { error: 'unauthorized' })
  const parsed = schema.safeParse(pod.body)
  if (!parsed.success) {
    return rejectPod(pod, 'reports', 422, {
      error: 'invalid_payload',
      details: zodDetails(parsed.error.issues),
    })
  }
  const b = parsed.data
  const supabase = createAnonClient()

  let photoUrl: string | null = null
  if (b.photo_base64) {
    const path = `pod/${Date.now()}-${pod.keyHash.slice(0, 8)}.jpg`
    const up = await supabase.storage
      .from('report-photos')
      .upload(path, Buffer.from(b.photo_base64, 'base64'), { contentType: 'image/jpeg' })
    if (!up.error) photoUrl = supabase.storage.from('report-photos').getPublicUrl(path).data.publicUrl
  }

  const { data, error } = await supabase.rpc('pod_report', {
    p_key_hash: pod.keyHash,
    p_category: b.category,
    p_lat: b.lat,
    p_lon: b.lon,
    p_confidence: b.confidence,
    p_captured_at: b.captured_at ?? new Date().toISOString(),
    p_description: b.description ?? null,
    p_photo_url: photoUrl,
    p_metadata: (b.metadata ?? {}) as Json,
    p_ip: pod.ip,
    p_log_body: pod.logBody,
  })
  return error ? answer(null) : answer(data)
}
