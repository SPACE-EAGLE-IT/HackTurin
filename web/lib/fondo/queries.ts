import { createClient } from '@/lib/supabase/server'

import type { Donation, ExpenseToReimburse, FundKpis, Sponsorship } from './types'

const EXPENSE_COLUMNS =
  'id, spent_on, kind, amount, self_certified, note, volunteer:profiles!volunteer_expenses_volunteer_id_fkey(id, full_name, email), mission:missions(id, title)'

/** Expenses not yet reimbursed, grouped by volunteer then by date (readable in full with `fondo` read). */
export async function listExpensesToReimburse(): Promise<ExpenseToReimburse[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('volunteer_expenses')
    .select(EXPENSE_COLUMNS)
    .is('reimbursed_at', null)
    .order('volunteer_id')
    .order('spent_on')
    .limit(2000)
    .overrideTypes<ExpenseToReimburse[], { merge: false }>()
  if (error) throw error
  return data.map(row => ({ ...row, amount: Number(row.amount) }))
}

export async function listDonations(): Promise<Donation[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('donations')
    .select('id, amount, currency, donor_name, donor_email, is_company, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  return data.map(row => ({ ...row, amount: Number(row.amount) }))
}

export async function listSponsorships(): Promise<Sponsorship[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('sponsorships')
    .select('id, company_name, caps, plan, amount, status, starts_on, ends_on, created_at')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error
  return data.map(row => ({ ...row, amount: row.amount === null ? null : Number(row.amount) }))
}

export async function getFundKpis(): Promise<FundKpis> {
  const supabase = await createClient()
  const [donations, expenses, sponsorships] = await Promise.all([
    supabase.from('donations').select('amount'),
    supabase.from('volunteer_expenses').select('amount, reimbursed_at'),
    supabase.from('sponsorships').select('caps').eq('status', 'active'),
  ])
  if (donations.error) throw donations.error
  if (expenses.error) throw expenses.error
  if (sponsorships.error) throw sponsorships.error

  const round = (n: number) => Math.round(n * 100) / 100
  let reimbursed = 0
  let toReimburse = 0
  for (const row of expenses.data) {
    if (row.reimbursed_at) reimbursed += Number(row.amount)
    else toReimburse += Number(row.amount)
  }
  return {
    raised: round(donations.data.reduce((sum, row) => sum + Number(row.amount), 0)),
    donors: donations.data.length,
    reimbursed: round(reimbursed),
    toReimburse: round(toReimburse),
    zonesAdopted: new Set(sponsorships.data.flatMap(row => row.caps)).size,
  }
}
