import { capFor } from '@/lib/civic/cap'
import { createAnonClient } from '@/lib/supabase/anon'

export type PublicReport = {
  id: string
  category: string
  status: string
  source: string
  lat: number
  lon: number
  severity: number
  observations: number
  description: string | null
  photo_url: string | null
  created_at: string
  resolved_at: string | null
  cap: string
}

/** Reports as the public sees them (no device ids, no metadata). */
export async function publicReports(includeClosed = false): Promise<PublicReport[]> {
  const { data, error } = await createAnonClient().rpc('public_reports', {
    p_include_closed: includeClosed,
    p_limit: 5000,
  })
  if (error) throw error
  return (data ?? []).map(r => ({ ...r, cap: capFor(r.lon, r.lat) }))
}

export async function publicFleet() {
  const { data } = await createAnonClient().rpc('public_fleet')
  return data?.[0] ?? { online: 0, total: 0 }
}

export async function publicFund() {
  const { data } = await createAnonClient().rpc('public_fund')
  return (
    data?.[0] ?? {
      raised: 0,
      donors: 0,
      reimbursed: 0,
      missions_verified: 0,
      volunteer_hours: 0,
      kg_collected: 0,
      zones_adopted: 0,
    }
  )
}

/** Aggregates for the public statistics page. */
export async function publicStats() {
  const [reports, fleet, fund] = await Promise.all([publicReports(true), publicFleet(), publicFund()])
  const open = reports.filter(r => r.status === 'open' || r.status === 'in_progress')
  const resolved = reports.filter(r => r.status === 'resolved' && r.resolved_at)
  const avgHours = resolved.length
    ? resolved.reduce((s, r) => s + (Date.parse(r.resolved_at!) - Date.parse(r.created_at)), 0) /
      resolved.length /
      36e5
    : null

  const byDay: { day: string; cittadini: number; pod: number }[] = []
  for (let i = 29; i >= 0; i--) {
    byDay.push({ day: new Date(Date.now() - i * 864e5).toISOString().slice(0, 10), cittadini: 0, pod: 0 })
  }
  const byCategory: Record<string, number> = {}
  const byCap: Record<string, { total: number; open: number }> = {}
  for (const r of reports) {
    const day = byDay.find(d => d.day === r.created_at.slice(0, 10))
    if (day) day[r.source === 'device' ? 'pod' : 'cittadini']++
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
    const c = (byCap[r.cap] ??= { total: 0, open: 0 })
    c.total++
    if (r.status === 'open' || r.status === 'in_progress') c.open++
  }

  return {
    totals: {
      all: reports.length,
      open: open.length,
      resolved: resolved.length,
      fromPods: reports.filter(r => r.source === 'device').length,
      avgResolutionHours: avgHours,
    },
    byDay,
    byCategory: Object.entries(byCategory)
      .map(([slug, total]) => ({ slug, total }))
      .sort((a, b) => b.total - a.total),
    byCap: Object.entries(byCap)
      .map(([cap, v]) => ({ cap, ...v }))
      .sort((a, b) => b.open - a.open),
    fleet,
    fund,
  }
}
