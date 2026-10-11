import type { StatusTone } from '@/components/ds/status-badge'
import type { Enums, Tables } from '@/lib/supabase/database.types'

export type MissionStatus = Enums<'mission_status'>
export type ExpenseKind = Enums<'expense_kind'>
export type MissionRow = Tables<'missions'>
export type ExpenseRow = Tables<'volunteer_expenses'>
export type VolunteerProfile = Tables<'volunteer_profiles'>

export const MISSION_STATUSES = [
  'open',
  'assigned',
  'submitted',
  'verified',
  'rejected',
] as const satisfies readonly MissionStatus[]

export const EXPENSE_KINDS = [
  'trasporto',
  'materiali',
  'pasto',
  'altro',
] as const satisfies readonly ExpenseKind[]

export const MISSION_STATUS_LABEL: Record<MissionStatus, string> = {
  open: 'Disponibile',
  assigned: 'In corso',
  submitted: 'Da verificare',
  verified: 'Verificata',
  rejected: 'Respinta',
}

export const MISSION_STATUS_TONE: Record<MissionStatus, StatusTone> = {
  open: 'info',
  assigned: 'warning',
  submitted: 'info',
  verified: 'success',
  rejected: 'destructive',
}

export const EXPENSE_KIND_LABEL: Record<ExpenseKind, string> = {
  trasporto: 'Trasporto',
  materiali: 'Materiali',
  pasto: 'Pasto',
  altro: 'Altro',
}

/** CTS art. 17 c.4: caps of self-certified reimbursements (the database enforces them too). */
export const DAILY_CAP = 10
export const MONTHLY_CAP = 150

export const MISSION_TABS = ['disponibili', 'mie', 'verifica'] as const
export type MissionTab = (typeof MISSION_TABS)[number]

export type PersonRef = { id: string; full_name: string; avatar_url: string | null }

/** What a list row shows: the mission plus the CAP and category of its report. */
export type MissionListItem = Pick<
  MissionRow,
  'id' | 'title' | 'status' | 'due_date' | 'volunteer_id' | 'submitted_at' | 'created_at' | 'team_size'
> & {
  /** Company whose team does the mission (corporate volunteering), if any. */
  company: string | null
  cap: string | null
  category: string | null
  volunteer: PersonRef | null
}

export type MissionExpense = Pick<
  ExpenseRow,
  'id' | 'spent_on' | 'kind' | 'amount' | 'self_certified' | 'note' | 'reimbursed_at' | 'volunteer_id'
>

export type MissionDetail = MissionRow & {
  company: string | null
  cap: string | null
  category: string | null
  reportStatus: string | null
  volunteer: PersonRef | null
  expenses: MissionExpense[]
}

/** A self-certified expense of the current volunteer, used to compute the remaining allowance. */
export type ExpenseUsage = { spent_on: string; amount: number }

export type MissionKpis = {
  open: number
  mineInProgress: number
  mineVerified: number
  /** Own verified hours: what the certificate and the level count. */
  mineHours: number
  /** Own expenses this month (all kinds). */
  monthExpenses: number
  /** Own self-certified expenses this month, against MONTHLY_CAP. */
  monthSelfCertified: number
}

/** Remaining self-certified allowance for a given day, from the volunteer's own expenses. */
export function allowanceFor(usage: ExpenseUsage[], day: string) {
  const month = day.slice(0, 7)
  let dayUsed = 0
  let monthUsed = 0
  for (const row of usage) {
    if (row.spent_on === day) dayUsed += row.amount
    if (row.spent_on.slice(0, 7) === month) monthUsed += row.amount
  }
  const round = (n: number) => Math.round(n * 100) / 100
  return {
    dayUsed: round(dayUsed),
    monthUsed: round(monthUsed),
    dayLeft: round(Math.max(0, DAILY_CAP - dayUsed)),
    monthLeft: round(Math.max(0, MONTHLY_CAP - monthUsed)),
  }
}

export const isEnrolled = (profile: Pick<VolunteerProfile, 'ets_member_at' | 'insured'> | null) =>
  Boolean(profile?.ets_member_at && profile.insured)

export const euro = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })

/** Recognition without money: levels by verified hours, shown to the volunteer and on the certificate. */
export const VOLUNTEER_LEVELS = [
  { min: 0, label: 'Nuovo volontario' },
  { min: 4, label: 'Volontario attivo' },
  { min: 20, label: 'Custode di quartiere' },
  { min: 50, label: 'Ambasciatore di Torino' },
] as const

export function volunteerLevel(hours: number) {
  let index = 0
  VOLUNTEER_LEVELS.forEach((level, i) => {
    if (hours >= level.min) index = i
  })
  const next = VOLUNTEER_LEVELS[index + 1]
  return {
    label: VOLUNTEER_LEVELS[index].label,
    next: next ? { label: next.label, hoursLeft: Math.round((next.min - hours) * 10) / 10 } : null,
  }
}

/** A verified mission as listed on the hours certificate. */
export type CertificateRow = {
  id: string
  title: string
  verified_at: string
  hours: number
  cap: string | null
}

/** Active company plan that can be linked to a team mission. */
export type TeamOption = { id: string; company: string; daysLeft: number }
