import type { StatusTone } from '@/components/ds/status-badge'
import type { Enums, Tables } from '@/lib/supabase/database.types'

export type ExpenseKind = Enums<'expense_kind'>
export type SponsorshipStatus = Enums<'sponsorship_status'>
export type Donation = Pick<
  Tables<'donations'>,
  'id' | 'amount' | 'currency' | 'donor_name' | 'donor_email' | 'is_company' | 'created_at'
>
export type Sponsorship = Pick<
  Tables<'sponsorships'>,
  'id' | 'company_name' | 'caps' | 'plan' | 'amount' | 'status' | 'starts_on' | 'ends_on' | 'created_at'
>

export const FUND_TABS = ['rimborsi', 'donazioni', 'adozioni'] as const
export type FundTab = (typeof FUND_TABS)[number]

export const SPONSORSHIP_STATUS_LABEL: Record<SponsorshipStatus, string> = {
  pending: 'In attesa di pagamento',
  active: 'Attiva',
  ended: 'Conclusa',
}

export const SPONSORSHIP_STATUS_TONE: Record<SponsorshipStatus, StatusTone> = {
  pending: 'warning',
  active: 'success',
  ended: 'muted',
}

export const EXPENSE_KIND_LABEL: Record<ExpenseKind, string> = {
  trasporto: 'Trasporto',
  materiali: 'Materiali',
  pasto: 'Pasto',
  altro: 'Altro',
}

/** An expense the ETS still has to pay back, with who and for which mission. */
export type ExpenseToReimburse = {
  id: string
  spent_on: string
  kind: ExpenseKind
  amount: number
  self_certified: boolean
  note: string | null
  volunteer: { id: string; full_name: string; email: string | null } | null
  mission: { id: string; title: string } | null
}

export type FundKpis = {
  raised: number
  donors: number
  reimbursed: number
  toReimburse: number
  zonesAdopted: number
}

export const euro = (n: number) =>
  n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 })
