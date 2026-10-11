import { capFor } from '@/lib/civic/cap'
import { parsePoint } from '@/lib/civic/geo'
import { todayKey } from '@/lib/date-keys'
import { createClient } from '@/lib/supabase/server'

import type {
  ExpenseUsage,
  MissionDetail,
  MissionExpense,
  MissionKpis,
  MissionListItem,
  MissionRow,
  MissionTab,
  PersonRef,
  VolunteerProfile,
} from './types'

const PERSON = 'id, full_name, avatar_url'
const REPORT = 'id, category, cap, geom, status'
const LIST_COLUMNS = `id, title, status, due_date, volunteer_id, submitted_at, created_at, report:reports(${REPORT}), volunteer:profiles!missions_volunteer_id_fkey(${PERSON})`

type ReportRef = { id: string; category: string; cap: string | null; geom: unknown; status: string }

/** The CAP of a report: the stored one, else the nearest centroid of its point. */
export function reportCap(report: Pick<ReportRef, 'cap' | 'geom'> | null): string | null {
  if (!report) return null
  if (report.cap) return report.cap
  const point = parsePoint(typeof report.geom === 'string' ? report.geom : null)
  return point ? capFor(point.lon, point.lat) : null
}

type ListRow = Omit<MissionListItem, 'cap' | 'category'> & { report: ReportRef | null }

function toListItem({ report, ...row }: ListRow): MissionListItem {
  return { ...row, cap: reportCap(report), category: report?.category ?? null }
}

export async function getVolunteerProfile(profileId: string): Promise<VolunteerProfile | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('volunteer_profiles')
    .select('*')
    .eq('profile_id', profileId)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Missions of one tab: open ones, the current volunteer's, or the ones waiting for verification. */
export async function listMissions(tab: MissionTab, profileId: string): Promise<MissionListItem[]> {
  const supabase = await createClient()
  let query = supabase.from('missions').select(LIST_COLUMNS)
  if (tab === 'disponibili') query = query.eq('status', 'open').is('volunteer_id', null)
  else if (tab === 'mie') query = query.eq('volunteer_id', profileId).neq('status', 'open')
  else query = query.eq('status', 'submitted')

  const { data, error } = await query
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(500)
    .overrideTypes<ListRow[], { merge: false }>()
  if (error) throw error
  return data.map(toListItem)
}

/** One mission with its report and the expenses the user may see, or `null`. */
export async function getMission(id: string): Promise<MissionDetail | null> {
  const supabase = await createClient()
  const [mission, expenses] = await Promise.all([
    supabase
      .from('missions')
      .select(`*, report:reports(${REPORT}), volunteer:profiles!missions_volunteer_id_fkey(${PERSON})`)
      .eq('id', id)
      .maybeSingle()
      .overrideTypes<
        MissionRow & { report: ReportRef | null; volunteer: PersonRef | null },
        { merge: false }
      >(),
    supabase
      .from('volunteer_expenses')
      .select('id, spent_on, kind, amount, self_certified, note, reimbursed_at, volunteer_id')
      .eq('mission_id', id)
      .order('spent_on', { ascending: false })
      .order('created_at', { ascending: false }),
  ])
  if (mission.error) throw mission.error
  if (expenses.error) throw expenses.error
  if (!mission.data) return null
  const { report, ...row } = mission.data
  return {
    ...row,
    cap: reportCap(report),
    category: report?.category ?? null,
    reportStatus: report?.status ?? null,
    expenses: expenses.data as MissionExpense[],
  }
}

/** Own self-certified expenses of the current and previous month (enough for the daily and monthly caps). */
export async function listExpenseUsage(profileId: string): Promise<ExpenseUsage[]> {
  const supabase = await createClient()
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('sv-SE')
  const { data, error } = await supabase
    .from('volunteer_expenses')
    .select('spent_on, amount')
    .eq('volunteer_id', profileId)
    .eq('self_certified', true)
    .gte('spent_on', from)
  if (error) throw error
  return data.map(row => ({ spent_on: row.spent_on, amount: Number(row.amount) }))
}

export async function getMissionKpis(profileId: string): Promise<MissionKpis> {
  const supabase = await createClient()
  const month = todayKey().slice(0, 7)
  const [open, mine, expenses] = await Promise.all([
    supabase
      .from('missions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open')
      .is('volunteer_id', null),
    supabase.from('missions').select('status').eq('volunteer_id', profileId),
    supabase
      .from('volunteer_expenses')
      .select('amount, self_certified')
      .eq('volunteer_id', profileId)
      .gte('spent_on', `${month}-01`),
  ])
  if (open.error) throw open.error
  if (mine.error) throw mine.error
  if (expenses.error) throw expenses.error

  let monthExpenses = 0
  let monthSelfCertified = 0
  for (const row of expenses.data) {
    monthExpenses += Number(row.amount)
    if (row.self_certified) monthSelfCertified += Number(row.amount)
  }
  return {
    open: open.count ?? 0,
    mineInProgress: mine.data.filter(row => row.status === 'assigned' || row.status === 'submitted').length,
    mineVerified: mine.data.filter(row => row.status === 'verified').length,
    monthExpenses: Math.round(monthExpenses * 100) / 100,
    monthSelfCertified: Math.round(monthSelfCertified * 100) / 100,
  }
}
