'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { requireAccess } from '@/lib/access/guard'
import { type ActionResult, fail, ok } from '@/lib/action-result'
import { getSession } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { TASK_PRIORITIES } from '@/lib/tasks/types'
import { dateKeySchema, fieldErrorsOf, optionalText, uuidSchema } from '@/lib/validation'

import { getReport, projectForCap } from './queries'
import { REPORT_STATUSES } from './types'

const interventionSchema = z.object({
  reportId: uuidSchema,
  title: z.string().trim().min(1, 'Il titolo è obbligatorio').max(200),
  description: optionalText(4000),
  assigneeId: uuidSchema.nullable().optional(),
  projectId: uuidSchema.nullable().optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: dateKeySchema.nullable().optional(),
})

/** Creates the field intervention that will resolve a report; the zone contract is picked from its CAP. */
export async function createIntervention(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = interventionSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('tasks', 'write')
  if (denied) return denied

  const report = await getReport(parsed.data.reportId)
  if (!report) return fail('Segnalazione non trovata')
  const session = await getSession()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? report.description,
      report_id: report.id,
      assignee_id: parsed.data.assigneeId ?? null,
      project_id: parsed.data.projectId ?? (await projectForCap(report.cap)),
      priority: parsed.data.priority ?? (report.severity >= 4 ? 'high' : 'medium'),
      due_date: parsed.data.dueDate ?? null,
      tags: [report.category, `CAP ${report.cap}`],
      created_by: session?.profile.id ?? null,
    })
    .select('id')
    .single()
  if (error) return fail('Intervento non creato')

  revalidatePath('/segnalazioni')
  revalidatePath(`/segnalazioni/${report.id}`)
  revalidatePath('/tasks')
  return ok({ id: data.id })
}

const missionSchema = z.object({
  reportId: uuidSchema,
  title: z.string().trim().min(1, 'Il titolo è obbligatorio').max(200),
  description: optionalText(2000),
  dueDate: dateKeySchema.nullable().optional(),
})

/** Offers a report to volunteers as a mission. */
export async function publishMission(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = missionSchema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('missioni', 'admin')
  if (denied) return denied

  const report = await getReport(parsed.data.reportId)
  if (!report) return fail('Segnalazione non trovata')
  const session = await getSession()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('missions')
    .insert({
      title: parsed.data.title,
      description: parsed.data.description ?? report.description,
      report_id: report.id,
      project_id: await projectForCap(report.cap),
      due_date: parsed.data.dueDate ?? null,
      created_by: session?.profile.id ?? null,
    })
    .select('id')
    .single()
  if (error) return fail('Missione non pubblicata')

  revalidatePath(`/segnalazioni/${report.id}`)
  revalidatePath('/missioni')
  return ok({ id: data.id })
}

const statusSchema = z.object({ id: uuidSchema, status: z.enum(REPORT_STATUSES) })

/** Rejects, reopens or closes a report by hand. */
export async function setReportStatus(input: unknown): Promise<ActionResult> {
  const parsed = statusSchema.safeParse(input)
  if (!parsed.success) return fail('Stato non valido')
  const denied = await requireAccess('segnalazioni', 'write')
  if (denied) return denied
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('reports')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id)
    .select('id')
  if (error || !data.length) return fail('Modifica non riuscita')
  revalidatePath('/segnalazioni')
  revalidatePath(`/segnalazioni/${parsed.data.id}`)
  return ok()
}
