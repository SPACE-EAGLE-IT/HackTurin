import { capFor } from '@/lib/civic/cap'
import { parsePoint } from '@/lib/civic/geo'
import { addDays, todayKey } from '@/lib/date-keys'
import type { Sponsorship } from '@/lib/fondo/types'
import { createAnonClient } from '@/lib/supabase/anon'
import { createClient } from '@/lib/supabase/server'

export const IMPACT_WINDOWS = ['adozione', '12mesi'] as const
export type ImpactWindow = (typeof IMPACT_WINDOWS)[number]

export type ImpactReport = {
  from: string
  to: string
  reports: {
    total: number
    resolved: number
    open: number
    fromCitizens: number
    fromPods: number
    /** Median days from report to resolution, `null` without resolved reports. */
    medianResolutionDays: number | null
    byCategory: { category: string; count: number }[]
  }
  missions: { verified: number; hours: number; kg: number; readable: boolean }
  air: { pods: number; pm25: number | null; pm10: number | null; no2: number | null }
}

const SPONSORSHIP_COLUMNS = 'id, company_name, caps, plan, amount, status, starts_on, ends_on, created_at'

/** The company's own adoptions; staff with `fondo` read sees all of them (RLS). */
export async function listSponsorships(): Promise<Sponsorship[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sponsorships')
    .select(SPONSORSHIP_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return data.map(row => ({ ...row, amount: row.amount === null ? null : Number(row.amount) }))
}

export async function getSponsorship(id: string): Promise<Sponsorship | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sponsorships')
    .select(SPONSORSHIP_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? { ...data, amount: data.amount === null ? null : Number(data.amount) } : null
}

/** The period the report covers: the adoption (until today) or the last twelve months. */
export function windowOf(sponsorship: Sponsorship, window: ImpactWindow) {
  const today = todayKey()
  if (window === '12mesi' || !sponsorship.starts_on) return { from: addDays(today, -365), to: today }
  const end = sponsorship.ends_on && sponsorship.ends_on < today ? sponsorship.ends_on : today
  return { from: sponsorship.starts_on, to: end }
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10
}

const inWindow = (iso: string | null, from: string, to: string) => {
  if (!iso) return false
  const day = new Date(iso).toLocaleDateString('sv-SE')
  return day >= from && day <= to
}

/** Numbers of the impact report, computed over the adopted CAPs from public and readable data. */
export async function getImpactReport(sponsorship: Sponsorship, window: ImpactWindow): Promise<ImpactReport> {
  const { from, to } = windowOf(sponsorship, window)
  const caps = new Set(sponsorship.caps)
  const anon = createAnonClient()
  const supabase = await createClient()

  const [reportsRes, podsRes, missionsRes] = await Promise.all([
    anon.rpc('public_reports', { p_include_closed: true, p_limit: 5000 }),
    anon.rpc('public_pod_readings'),
    supabase
      .from('missions')
      .select('verified_at, hours, kg_collected, report:reports(cap, geom)')
      .eq('status', 'verified')
      .overrideTypes<
        {
          verified_at: string | null
          hours: number | null
          kg_collected: number | null
          report: { cap: string | null; geom: unknown } | null
        }[],
        { merge: false }
      >(),
  ])

  // Reports: citizens and PODs, filtered by the CAP of their point.
  const reports = (reportsRes.data ?? []).filter(
    r => caps.has(capFor(r.lon, r.lat)) && inWindow(r.created_at, from, to)
  )
  const resolved = reports.filter(r => r.status === 'resolved')
  const days = resolved
    .filter(r => r.resolved_at)
    .map(r => (new Date(r.resolved_at as string).getTime() - new Date(r.created_at).getTime()) / 86_400_000)
  const byCategory = new Map<string, number>()
  for (const r of reports) byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + 1)
  const med = median(days)

  // Missions: readable only with `missioni` read; otherwise the numbers stay at zero.
  let verified = 0
  let hours = 0
  let kg = 0
  for (const m of missionsRes.data ?? []) {
    if (!m.report || !inWindow(m.verified_at, from, to)) continue
    const point = parsePoint(typeof m.report.geom === 'string' ? m.report.geom : null)
    const cap = m.report.cap ?? (point ? capFor(point.lon, point.lat) : null)
    if (!cap || !caps.has(cap)) continue
    verified++
    hours += Number(m.hours ?? 0)
    kg += Number(m.kg_collected ?? 0)
  }

  // Air: latest reading of every POD inside the adopted CAPs (last three hours).
  const pods = (podsRes.data ?? []).filter(p => caps.has(capFor(p.lon, p.lat)))
  const metric = (key: string) =>
    mean(
      pods
        .map(p =>
          p.metrics && typeof p.metrics === 'object' && !Array.isArray(p.metrics) ? p.metrics[key] : null
        )
        .filter((v): v is number => typeof v === 'number')
    )

  return {
    from,
    to,
    reports: {
      total: reports.length,
      resolved: resolved.length,
      open: reports.filter(r => r.status === 'open' || r.status === 'in_progress').length,
      fromCitizens: reports.filter(r => r.source === 'citizen').length,
      fromPods: reports.filter(r => r.source === 'device').length,
      medianResolutionDays: med === null ? null : Math.round(med * 10) / 10,
      byCategory: [...byCategory.entries()]
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count),
    },
    missions: {
      verified,
      hours: Math.round(hours * 10) / 10,
      kg: Math.round(kg * 10) / 10,
      readable: !missionsRes.error,
    },
    air: { pods: pods.length, pm25: metric('pm25_ugm3'), pm10: metric('pm10_ugm3'), no2: metric('no2_ugm3') },
  }
}
