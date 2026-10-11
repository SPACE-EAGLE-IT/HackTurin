import { z } from 'zod'

import { TORINO_BOUNDS as B } from '@/lib/civic/categories'
import { MetricsSchema } from '@/lib/civic/metrics'
import { answer, readPodRequest, rejectPod, zodDetails } from '@/lib/pod/request'
import { createAnonClient } from '@/lib/supabase/anon'
import type { Json } from '@/lib/supabase/database.types'

const reading = z.object({
  lat: z.number().min(B.minLat).max(B.maxLat).optional(),
  lon: z.number().min(B.minLon).max(B.maxLon).optional(),
  captured_at: z.string().datetime().optional(),
  metrics: MetricsSchema,
})
const batch = z.object({ readings: z.array(reading).min(1).max(100) })

/** Sensor readings: one, or a batch of up to 100 sent after a period offline. */
export async function POST(req: Request) {
  const pod = await readPodRequest(req)
  if (!pod.keyHash) return rejectPod(pod, 'readings', 401, { error: 'unauthorized' })
  const isBatch = !!pod.body && typeof pod.body === 'object' && 'readings' in pod.body
  const parsed = isBatch ? batch.safeParse(pod.body) : reading.safeParse(pod.body)
  if (!parsed.success) {
    return rejectPod(pod, 'readings', 422, {
      error: 'invalid_payload',
      details: zodDetails(parsed.error.issues),
    })
  }
  const rows = 'readings' in parsed.data ? parsed.data.readings : [parsed.data]
  const { data, error } = await createAnonClient().rpc('pod_readings', {
    p_key_hash: pod.keyHash,
    p_rows: rows as unknown as Json,
    p_ip: pod.ip,
    p_log_body: pod.logBody,
  })
  return error ? answer(null) : answer(data)
}
