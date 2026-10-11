import { parsePoint } from '@/lib/civic/geo'
import type { Json } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'

import {
  isOnline,
  type LogFilters,
  type PodDetail,
  type PodKey,
  type PodListItem,
  type PodLogRow,
  type PodReading,
  type PodReport,
  type PodTraffic,
} from './types'

const LIST_COLUMNS = 'id, name, type, label, battery, firmware, last_seen_at, active, created_at'
const DAY_MS = 24 * 60 * 60 * 1000

const since24h = () => new Date(Date.now() - DAY_MS).toISOString()

type Supabase = Awaited<ReturnType<typeof createClient>>

/** Exact row count of the log in the last 24 hours, optionally narrowed. */
async function countLog(
  supabase: Supabase,
  { deviceId, errors, rejected }: { deviceId?: string; errors?: boolean; rejected?: boolean }
) {
  let query = supabase
    .from('api_request_log')
    .select('id', { count: 'exact', head: true })
    .gte('ts', since24h())
  if (deviceId) query = query.eq('device_id', deviceId)
  if (errors) query = query.gte('status', 400)
  if (rejected) query = query.is('device_id', null)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

/** Every POD with its online flag and the last 24 hours of API traffic. */
export async function listDevices(): Promise<PodListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('devices').select(LIST_COLUMNS).order('name')
  if (error) throw error
  const now = Date.now()
  // Counts are exact head queries: the log can exceed the PostgREST row cap.
  return Promise.all(
    data.map(async device => {
      const [requests24h, errors24h] = await Promise.all([
        countLog(supabase, { deviceId: device.id }),
        countLog(supabase, { deviceId: device.id, errors: true }),
      ])
      return { ...device, online: isOnline(device.last_seen_at, now), requests24h, errors24h }
    })
  )
}

/** The numbers of the KPI band: PODs online and the API traffic of the last 24 hours. */
export async function getPodTraffic(devices?: PodListItem[]): Promise<PodTraffic> {
  const supabase = await createClient()
  const [list, requests24h, errors24h, rejected24h] = await Promise.all([
    devices ?? listDevices(),
    countLog(supabase, {}),
    countLog(supabase, { errors: true }),
    countLog(supabase, { rejected: true }),
  ])
  return {
    total: list.length,
    online: list.filter(device => device.active && device.online).length,
    requests24h,
    errors24h,
    rejected24h,
  }
}

type LogRowWithDevice = Omit<PodLogRow, 'device_name'> & { device: { name: string } | null }

/** The API log, newest first, with the POD name (null when the key was unknown). */
export async function listLogs({ deviceId, errorsOnly, limit = 60 }: LogFilters = {}): Promise<PodLogRow[]> {
  const supabase = await createClient()
  let query = supabase
    .from('api_request_log')
    .select('id, ts, status, endpoint, key_prefix, device_id, ip, body, device:devices(name)')
  if (deviceId) query = query.eq('device_id', deviceId)
  if (errorsOnly) query = query.gte('status', 400)
  const { data, error } = await query
    .order('ts', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 500))
    .overrideTypes<LogRowWithDevice[], { merge: false }>()
  if (error) throw error
  return data.map(({ device, ...row }) => ({ ...row, device_name: device?.name ?? null }))
}

/** Keeps only the numeric values of a metrics object. */
function numericMetrics(metrics: Json): Record<string, number> {
  const out: Record<string, number> = {}
  if (!metrics || typeof metrics !== 'object' || Array.isArray(metrics)) return out
  for (const [key, value] of Object.entries(metrics)) {
    if (typeof value === 'number' && Number.isFinite(value)) out[key] = value
  }
  return out
}

/** One POD with its keys, last log rows, readings (oldest first) and reports, or `null`. */
export async function getDevice(id: string): Promise<PodDetail | null> {
  const supabase = await createClient()
  const [device, keys, logs, readings, reports, requests24h, errors24h] = await Promise.all([
    supabase.from('devices').select(`${LIST_COLUMNS}, fixed_geom, last_geom`).eq('id', id).maybeSingle(),
    supabase
      .from('api_keys')
      .select('id, key_prefix, label, created_at, last_used_at, revoked_at')
      .eq('device_id', id)
      .order('created_at', { ascending: false }),
    listLogs({ deviceId: id, limit: 60 }),
    supabase
      .from('device_readings')
      .select('ts, metrics')
      .eq('device_id', id)
      .order('ts', { ascending: false })
      .limit(300),
    supabase
      .from('reports')
      .select('id, category, status, created_at, confidence, observations')
      .eq('device_id', id)
      .order('created_at', { ascending: false })
      .limit(20),
    countLog(supabase, { deviceId: id }),
    countLog(supabase, { deviceId: id, errors: true }),
  ])
  if (device.error) throw device.error
  if (keys.error) throw keys.error
  if (readings.error) throw readings.error
  if (reports.error) throw reports.error
  if (!device.data) return null

  const { fixed_geom, last_geom, ...row } = device.data
  const parsedReadings: PodReading[] = readings.data
    .map(reading => ({ ts: reading.ts, metrics: numericMetrics(reading.metrics) }))
    .reverse()
  const frequency = new Map<string, number>()
  for (const reading of parsedReadings) {
    for (const key of Object.keys(reading.metrics)) frequency.set(key, (frequency.get(key) ?? 0) + 1)
  }

  return {
    ...row,
    online: isOnline(row.last_seen_at),
    requests24h,
    errors24h,
    position: parsePoint((last_geom ?? fixed_geom) as string | null),
    keys: keys.data satisfies PodKey[],
    logs,
    readings: parsedReadings,
    metrics: [...frequency.entries()].sort((a, b) => b[1] - a[1]).map(([key]) => key),
    reports: reports.data satisfies PodReport[],
  }
}
