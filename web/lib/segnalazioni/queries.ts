import { capFor } from '@/lib/civic/cap'
import { parsePoint } from '@/lib/civic/geo'
import { createClient } from '@/lib/supabase/server'

import {
  priorityOf,
  type ReportDetail,
  type ReportFilters,
  type ReportKpis,
  type ReportListItem,
  type ReportSource,
  type ReportStatus,
} from './types'

const LIST_COLUMNS =
  'id, category, status, source, description, photo_url, confidence, severity, observations, created_at, resolved_at, geom, device:devices(name)'

type Raw = {
  id: string
  category: string
  status: string
  source: string
  description: string | null
  photo_url: string | null
  confidence: number
  severity: number
  observations: number
  created_at: string
  resolved_at: string | null
  geom: unknown
  device: { name: string } | null
}

function shape(r: Raw): ReportListItem | null {
  const p = parsePoint(typeof r.geom === 'string' ? r.geom : null)
  if (!p) return null
  return {
    id: r.id,
    category: r.category,
    status: r.status as ReportStatus,
    source: r.source as ReportSource,
    description: r.description,
    photo_url: r.photo_url,
    confidence: Number(r.confidence),
    severity: r.severity,
    observations: r.observations,
    created_at: r.created_at,
    resolved_at: r.resolved_at,
    lat: p.lat,
    lon: p.lon,
    cap: capFor(p.lon, p.lat),
    device_name: r.device?.name ?? null,
  }
}

/** Reports matching the filters, the most urgent first (open work), then the newest. */
export async function listReports(filters: ReportFilters = {}, limit = 2000): Promise<ReportListItem[]> {
  const supabase = await createClient()
  let query = supabase.from('reports').select(LIST_COLUMNS)
  if (filters.status?.length) query = query.in('status', filters.status)
  if (filters.category?.length) query = query.in('category', filters.category)
  if (filters.source?.length) query = query.in('source', filters.source)
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit)
    .overrideTypes<Raw[], { merge: false }>()
  if (error) throw error

  const q = filters.q?.toLowerCase()
  return data
    .map(shape)
    .filter((r): r is ReportListItem => r !== null)
    .filter(r => !filters.cap?.length || filters.cap.includes(r.cap))
    .filter(r => !q || (r.description ?? '').toLowerCase().includes(q) || r.cap.includes(q))
    .sort((a, b) => {
      const openA = a.status === 'open' || a.status === 'in_progress'
      const openB = b.status === 'open' || b.status === 'in_progress'
      if (openA !== openB) return openA ? -1 : 1
      return openA ? priorityOf(b) - priorityOf(a) : b.created_at.localeCompare(a.created_at)
    })
}

/** One report with the interventions and missions that work on it. */
export async function getReport(id: string): Promise<ReportDetail | null> {
  const supabase = await createClient()
  const [report, tasks, missions] = await Promise.all([
    supabase
      .from('reports')
      .select(`${LIST_COLUMNS}, metadata`)
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<Raw & { metadata: unknown }, { merge: false }>(),
    supabase
      .from('tasks')
      .select('id, title, status, assignee:profiles!tasks_assignee_id_fkey(full_name)')
      .eq('report_id', id)
      .overrideTypes<
        { id: string; title: string; status: string; assignee: { full_name: string } | null }[],
        { merge: false }
      >(),
    supabase
      .from('missions')
      .select('id, title, status, volunteer:profiles!missions_volunteer_id_fkey(full_name)')
      .eq('report_id', id)
      .overrideTypes<
        { id: string; title: string; status: string; volunteer: { full_name: string } | null }[],
        { merge: false }
      >(),
  ])
  if (report.error) throw report.error
  if (!report.data) return null
  const base = shape(report.data)
  if (!base) return null
  return {
    ...base,
    metadata: report.data.metadata,
    interventions: (tasks.data ?? []).map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      assignee: t.assignee?.full_name ?? null,
    })),
    missions: (missions.data ?? []).map(m => ({
      id: m.id,
      title: m.title,
      status: m.status,
      volunteer: m.volunteer?.full_name ?? null,
    })),
  }
}

export async function getReportKpis(): Promise<ReportKpis> {
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 864e5).toISOString()
  const count = (q: PromiseLike<{ count: number | null }>) => q.then(r => r.count ?? 0)
  const [open, inProgress, resolved30, fromPods] = await Promise.all([
    count(supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'open')),
    count(supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'in_progress')),
    count(
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'resolved')
        .gte('resolved_at', since)
    ),
    count(
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('source', 'device')
        .in('status', ['open', 'in_progress'])
    ),
  ])
  return { open, inProgress, resolved30, fromPods }
}

/** The zone contract (appalto) covering a CAP, if any. */
export async function projectForCap(cap: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('projects')
    .select('id')
    .contains('caps', [cap])
    .eq('status', 'active')
    .limit(1)
  return data?.[0]?.id ?? null
}
