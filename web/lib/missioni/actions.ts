'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAccess } from '@/lib/access/guard'
import { type ActionResult, fail, ok } from '@/lib/action-result'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { dateKeySchema, fieldErrorsOf, optionalText, uuidSchema } from '@/lib/validation'

import { EXPENSE_KINDS, isEnrolled } from './types'

const PHOTO_BUCKET = 'report-photos'
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PHOTO_MAX_BYTES = 5 * 1024 * 1024

type DbError = { code?: string; message: string } | null

/** Messages raised by the database triggers (caps, enrolment) are already Italian: show them as they are. */
function dbFail(error: DbError, fallback: string) {
  if (error?.code === 'P0001' || error?.code === '42501') return fail(error.message)
  return fail(fallback)
}

function revalidateMission(id?: string) {
  revalidatePath('/missioni')
  if (id) revalidatePath(`/missioni/${id}`)
  revalidatePath('/fondo')
}

const enrolSchema = z.object({
  member: z.boolean(),
  insured: z.boolean(),
  pattoRef: optionalText(80),
})

/** Self-enrolment for the demo: the volunteer declares ETS membership and insurance. */
export async function enrolVolunteer(input: unknown): Promise<ActionResult> {
  const parsed = enrolSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('missioni', 'write')
  if (denied) return denied
  const session = await getSession()
  if (!session) return fail('Sessione scaduta: accedi di nuovo')

  const supabase = await createClient()
  const { data: current } = await supabase
    .from('volunteer_profiles')
    .select('ets_member_at')
    .eq('profile_id', session.profile.id)
    .maybeSingle()
  const { error } = await supabase.from('volunteer_profiles').upsert(
    {
      profile_id: session.profile.id,
      ets_member_at: parsed.data.member ? (current?.ets_member_at ?? new Date().toISOString()) : null,
      insured: parsed.data.insured,
      patto_ref: parsed.data.pattoRef ?? null,
    },
    { onConflict: 'profile_id' }
  )
  if (error) return dbFail(error, 'Iscrizione non riuscita')
  revalidateMission()
  return ok()
}

/** The current volunteer takes an open, unassigned mission. */
export async function takeMission(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail('Dati non validi')
  const denied = await requireAccess('missioni', 'write')
  if (denied) return denied
  const session = await getSession()
  if (!session) return fail('Sessione scaduta: accedi di nuovo')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('volunteer_profiles')
    .select('ets_member_at, insured')
    .eq('profile_id', session.profile.id)
    .maybeSingle()
  if (!isEnrolled(profile)) {
    return fail('Per prendere una missione serve l’iscrizione all’associazione partner con assicurazione')
  }

  const { data, error } = await supabase
    .from('missions')
    .update({ volunteer_id: session.profile.id, status: 'assigned' })
    .eq('id', id)
    .eq('status', 'open')
    .is('volunteer_id', null)
    .select('id')
  if (error) return dbFail(error, 'Non è stato possibile prendere la missione')
  if (data.length === 0) return fail('La missione non è più disponibile')
  revalidateMission(id)
  return ok()
}

const submitSchema = z.object({
  missionId: uuidSchema,
  hours: z.number().min(0, 'Ore non valide').max(24, 'Massimo 24 ore').nullable(),
  kg: z.number().min(0, 'Peso non valido').max(99999).nullable(),
  note: optionalText(2000),
})

function numberOf(value: FormDataEntryValue | null): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

function photoOf(value: FormDataEntryValue | null): File | null {
  return value instanceof File && value.size > 0 ? value : null
}

/** The assigned volunteer submits the outcome: photos, hours, kg and a note. */
export async function submitMission(formData: FormData): Promise<ActionResult> {
  const parsed = submitSchema.safeParse({
    missionId: formData.get('missionId'),
    hours: numberOf(formData.get('hours')),
    kg: numberOf(formData.get('kg')),
    note: typeof formData.get('note') === 'string' ? formData.get('note') : null,
  })
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const before = photoOf(formData.get('photoBefore'))
  const after = photoOf(formData.get('photoAfter'))
  for (const [field, file] of [
    ['photoBefore', before],
    ['photoAfter', after],
  ] as const) {
    if (!file) continue
    if (!PHOTO_TYPES.includes(file.type))
      return fail('Controlla i campi', { [field]: 'Solo JPEG, PNG o WebP' })
    if (file.size > PHOTO_MAX_BYTES) return fail('Controlla i campi', { [field]: 'Massimo 5 MB' })
  }
  const denied = await requireAccess('missioni', 'write')
  if (denied) return denied
  const session = await getSession()
  if (!session) return fail('Sessione scaduta: accedi di nuovo')

  const { missionId, hours, kg, note } = parsed.data
  const supabase = await createClient()
  const { data: mission } = await supabase
    .from('missions')
    .select('volunteer_id, status, photo_after_url')
    .eq('id', missionId)
    .maybeSingle()
  if (!mission || mission.volunteer_id !== session.profile.id) return fail('La missione non è assegnata a te')
  if (mission.status !== 'assigned' && mission.status !== 'rejected') {
    return fail('La missione è già stata inviata')
  }
  if (!after && !mission.photo_after_url)
    return fail('Controlla i campi', { photoAfter: 'Serve la foto dopo' })

  const upload = async (file: File, which: 'before' | 'after') => {
    const path = `missions/${missionId}/${which}-${Date.now()}.jpg`
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })
    if (error) return null
    return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl
  }
  const beforeUrl = before ? await upload(before, 'before') : undefined
  const afterUrl = after ? await upload(after, 'after') : undefined
  if (beforeUrl === null || afterUrl === null) return fail('Caricamento della foto non riuscito')

  const { data, error } = await supabase
    .from('missions')
    .update({
      status: 'submitted',
      hours,
      kg_collected: kg,
      volunteer_note: note ?? null,
      ...(beforeUrl && { photo_before_url: beforeUrl }),
      ...(afterUrl && { photo_after_url: afterUrl }),
    })
    .eq('id', missionId)
    .select('id')
  if (error) return dbFail(error, 'Invio non riuscito')
  if (data.length === 0) return fail('Invio non riuscito')
  revalidateMission(missionId)
  return ok()
}

const expenseSchema = z.object({
  missionId: uuidSchema,
  spentOn: dateKeySchema,
  kind: z.enum(EXPENSE_KINDS),
  amount: z.number({ message: 'Indica l’importo' }).positive('L’importo deve essere positivo').max(99999),
  selfCertified: z.boolean(),
  note: optionalText(300),
})

/** Adds an expense of the current volunteer; the database enforces the self-certification caps. */
export async function addExpense(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = expenseSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('missioni', 'write')
  if (denied) return denied
  const session = await getSession()
  if (!session) return fail('Sessione scaduta: accedi di nuovo')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('volunteer_expenses')
    .insert({
      mission_id: parsed.data.missionId,
      volunteer_id: session.profile.id,
      spent_on: parsed.data.spentOn,
      kind: parsed.data.kind,
      amount: parsed.data.amount,
      self_certified: parsed.data.selfCertified,
      note: parsed.data.note ?? null,
    })
    .select('id')
    .single()
  if (error) return dbFail(error, 'Salvataggio della spesa non riuscito')
  revalidateMission(parsed.data.missionId)
  return ok({ id: data.id })
}

/** Mission admins verify a submitted mission; the linked report is resolved by the database. */
export async function verifyMission(id: string): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) return fail('Dati non validi')
  const denied = await requireAccess('missioni', 'admin')
  if (denied) return denied
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('missions')
    .update({ status: 'verified', review_note: null })
    .eq('id', id)
    .eq('status', 'submitted')
    .select('id')
  if (error) return dbFail(error, 'Verifica non riuscita')
  if (data.length === 0) return fail('La missione non è in attesa di verifica')
  revalidateMission(id)
  revalidatePath('/segnalazioni')
  return ok()
}

const rejectSchema = z.object({
  id: uuidSchema,
  reason: z.string().trim().min(1, 'Scrivi il motivo').max(1000),
})

export async function rejectMission(input: unknown): Promise<ActionResult> {
  const parsed = rejectSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('missioni', 'admin')
  if (denied) return denied
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('missions')
    .update({ status: 'rejected', review_note: parsed.data.reason })
    .eq('id', parsed.data.id)
    .eq('status', 'submitted')
    .select('id')
  if (error) return dbFail(error, 'Operazione non riuscita')
  if (data.length === 0) return fail('La missione non è in attesa di verifica')
  revalidateMission(parsed.data.id)
  return ok()
}

const createSchema = z.object({
  title: z.string().trim().min(1, 'Il titolo è obbligatorio').max(200, 'Massimo 200 caratteri'),
  description: optionalText(4000),
  dueDate: dateKeySchema.nullable().optional(),
  reportId: uuidSchema.nullable().optional(),
  sponsorshipId: uuidSchema.nullable().optional(),
  teamSize: z.number().int().min(1, 'Almeno 1 persona').max(50, 'Massimo 50 persone').optional(),
})

/**
 * Staff creates a mission (optionally from a civic report). A company team mission is assigned
 * straight to the company's account: the ETS covers the team for that day.
 */
export async function createMission(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = createSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('missioni', 'admin')
  if (denied) return denied
  const session = await getSession()
  const supabase = await createClient()
  let team: { profile_id: string | null } | null = null
  if (parsed.data.sponsorshipId) {
    const { data: plan } = await supabase
      .from('sponsorships')
      .select('profile_id, status')
      .eq('id', parsed.data.sponsorshipId)
      .maybeSingle()
    if (!plan || plan.status !== 'active') return fail('Il piano dell’azienda non è attivo')
    team = plan
  }
  const { data, error } = await supabase
    .from('missions')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      due_date: parsed.data.dueDate ?? null,
      report_id: parsed.data.reportId ?? null,
      created_by: session?.profile.id ?? null,
      sponsorship_id: parsed.data.sponsorshipId ?? null,
      team_size: team ? (parsed.data.teamSize ?? 10) : 1,
      ...(team?.profile_id ? { volunteer_id: team.profile_id, status: 'assigned' as const } : {}),
    })
    .select('id')
    .single()
  if (error) return dbFail(error, 'Salvataggio non riuscito')
  revalidateMission(data.id)
  return ok({ id: data.id })
}
