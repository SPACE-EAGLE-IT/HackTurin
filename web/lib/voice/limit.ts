// Per-instance limiter: one caller looping the tool cannot flood the reports table.
const hits = new Map<string, number[]>()

/** True when `key` made more than `max` calls in the last minute. */
export function rateLimited(key: string, max = 10, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter(t => now - t < 60_000)
  recent.push(now)
  hits.set(key, recent)
  return recent.length > max
}

export const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
