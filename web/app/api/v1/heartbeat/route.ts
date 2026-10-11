import { z } from 'zod'

import { MetricsSchema } from '@/lib/civic/metrics'
import { answer, readPodRequest, rejectPod, zodDetails } from '@/lib/pod/request'
import { createAnonClient } from '@/lib/supabase/anon'

const schema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  battery: z.number().min(0).max(100).optional(),
  firmware: z.string().max(64).optional(),
  metrics: MetricsSchema.optional(),
})

/** "I am alive" with position, battery and optional readings. */
export async function POST(req: Request) {
  const pod = await readPodRequest(req)
  if (!pod.keyHash) return rejectPod(pod, 'heartbeat', 401, { error: 'unauthorized' })
  const parsed = schema.safeParse(pod.body ?? {})
  if (!parsed.success) {
    return rejectPod(pod, 'heartbeat', 422, {
      error: 'invalid_payload',
      details: zodDetails(parsed.error.issues),
    })
  }
  const b = parsed.data
  const { data, error } = await createAnonClient().rpc('pod_heartbeat', {
    p_key_hash: pod.keyHash,
    p_lat: b.lat ?? null,
    p_lon: b.lon ?? null,
    p_battery: b.battery ?? null,
    p_firmware: b.firmware ?? null,
    p_metrics: b.metrics ?? null,
    p_ip: pod.ip,
    p_log_body: pod.logBody,
  })
  return error ? answer(null) : answer(data)
}
