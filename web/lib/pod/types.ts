import type { StatusTone } from '@/components/ds/status-badge'
import type { Json, Tables } from '@/lib/supabase/database.types'

export const DEVICE_TYPES = ['fixed', 'mobile', 'phone'] as const
export type DeviceType = (typeof DEVICE_TYPES)[number]

export const DEVICE_TYPE_LABEL: Record<string, string> = {
  fixed: 'Fisso',
  mobile: 'Mobile',
  phone: 'Telefono',
}
export const deviceTypeLabel = (type: string) => DEVICE_TYPE_LABEL[type] ?? type

/** Mobile and phone PODs travel: their label is a vehicle, not a place. */
export const isMovingType = (type: string) => type === 'mobile' || type === 'phone'

/** A POD counts as online when it was heard from within this window. */
export const ONLINE_WINDOW_MS = 15 * 60 * 1000

export type PodState = 'online' | 'offline' | 'disabled'

export const POD_STATE_LABEL: Record<PodState, string> = {
  online: 'Online',
  offline: 'Offline',
  disabled: 'Disattivato',
}

export const POD_STATE_TONE: Record<PodState, StatusTone> = {
  online: 'success',
  offline: 'muted',
  disabled: 'warning',
}

export function podState(device: { active: boolean; online: boolean }): PodState {
  if (!device.active) return 'disabled'
  return device.online ? 'online' : 'offline'
}

export function isOnline(lastSeenAt: string | null, now = Date.now()) {
  return lastSeenAt !== null && now - new Date(lastSeenAt).getTime() <= ONLINE_WINDOW_MS
}

/** Tone of an HTTP status in the traffic log. */
export function httpStatusTone(status: number): StatusTone {
  if (status < 300) return 'success'
  if (status === 401 || status === 403 || status >= 500) return 'destructive'
  if (status >= 400) return 'warning'
  return 'info'
}

export const ENDPOINT_LABEL: Record<string, string> = {
  reports: 'Segnalazione',
  readings: 'Letture',
  heartbeat: 'Heartbeat',
}
export const endpointLabel = (endpoint: string) => ENDPOINT_LABEL[endpoint] ?? endpoint

type DeviceRow = Tables<'devices'>

/** What the list needs for one POD. */
export type PodListItem = Pick<
  DeviceRow,
  'id' | 'name' | 'type' | 'label' | 'battery' | 'firmware' | 'last_seen_at' | 'active' | 'created_at'
> & {
  online: boolean
  requests24h: number
  errors24h: number
}

/** The numbers above the list. */
export type PodTraffic = {
  total: number
  online: number
  requests24h: number
  errors24h: number
  rejected24h: number
}

/** One row of the API traffic log. */
export type PodLogRow = {
  id: number
  ts: string
  status: number
  endpoint: string
  key_prefix: string | null
  device_id: string | null
  ip: string | null
  body: Json | null
  device_name: string | null
}

export type PodKey = Pick<
  Tables<'api_keys'>,
  'id' | 'key_prefix' | 'label' | 'created_at' | 'last_used_at' | 'revoked_at'
>

export type PodReading = { ts: string; metrics: Record<string, number> }

export type PodReport = Pick<
  Tables<'reports'>,
  'id' | 'category' | 'status' | 'created_at' | 'confidence' | 'observations'
>

/** Everything the detail page shows. */
export type PodDetail = PodListItem & {
  position: { lat: number; lon: number } | null
  keys: PodKey[]
  logs: PodLogRow[]
  readings: PodReading[]
  /** Metric names found in the readings, most frequent first. */
  metrics: string[]
  reports: PodReport[]
}

export type LogFilters = { deviceId?: string; errorsOnly?: boolean; limit?: number }

/** Prefix of every POD key; the stored prefix is the first 14 characters of the key. */
export const API_KEY_PREFIX = 'ts_live_'
export const API_KEY_PREFIX_LENGTH = 14
