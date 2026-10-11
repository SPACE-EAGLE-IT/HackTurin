import { tool } from 'ai'
import { z } from 'zod'

import { hasLevel } from '@/lib/access/types'
import { ok } from '@/lib/action-result'
import { defineProposal, type ModuleAi, proposalTool } from '@/lib/ai/registry'
import { CAPS } from '@/lib/civic/cap'
import { CATEGORIES, categoryName } from '@/lib/civic/categories'
import { formatDateIt } from '@/lib/format-date'
import { dateKeySchema, uuidSchema } from '@/lib/validation'

import { createIntervention, publishMission } from './actions'
import { getReport, getReportKpis, listReports } from './queries'
import {
  priorityOf,
  REPORT_SOURCE_LABEL,
  REPORT_SOURCES,
  REPORT_STATUS_LABEL,
  REPORT_STATUSES,
  type ReportListItem,
} from './types'

const SLUGS = CATEGORIES.map(c => c.slug) as [string, ...string[]]

const interventionSchema = z.object({
  reportId: uuidSchema.describe('Id della segnalazione, da list_reports'),
  title: z.string().trim().min(1).max(200).describe('Titolo dell’intervento'),
  assigneeId: uuidSchema.optional().describe('Id della persona o squadra, da list_people'),
  dueDate: dateKeySchema.optional().describe('Scadenza YYYY-MM-DD'),
})

const missionSchema = z.object({
  reportId: uuidSchema.describe('Id della segnalazione, da list_reports'),
  title: z.string().trim().min(1).max(200).describe('Titolo della missione per i volontari'),
  dueDate: dateKeySchema.optional(),
})

function compact(r: ReportListItem) {
  return {
    id: r.id,
    category: categoryName(r.category),
    status: REPORT_STATUS_LABEL[r.status],
    source: REPORT_SOURCE_LABEL[r.source],
    cap: r.cap,
    severity: r.severity,
    observations: r.observations,
    priority: Math.round(priorityOf(r) * 10) / 10,
    createdAt: r.created_at,
    description: r.description,
    href: `/segnalazioni/${r.id}`,
  }
}

export const segnalazioniAi: ModuleAi = {
  key: 'segnalazioni',
  description:
    'Segnalazioni dei cittadini e dei POD: elenco per stato, categoria, fonte e CAP, zone più colpite; proposte di intervento e di missione per i volontari.',
  examples: [
    'Quali zone hanno più rifiuti abbandonati aperti?',
    'Le 5 segnalazioni più urgenti di oggi',
    'Crea un intervento per la segnalazione più urgente del 10152',
  ],
  tools: ctx => {
    if (!hasLevel(ctx.access.segnalazioni, 'read')) return {}
    const read = {
      list_reports: tool({
        description: 'Elenca le segnalazioni, le più urgenti per prime (al massimo 50).',
        inputSchema: z.object({
          status: z
            .array(z.enum(REPORT_STATUSES))
            .optional()
            .describe('Di default solo aperte e in lavorazione'),
          category: z.array(z.enum(SLUGS)).optional(),
          source: z.array(z.enum(REPORT_SOURCES)).optional(),
          cap: z.array(z.enum(CAPS as [string, ...string[]])).optional(),
          q: z.string().max(80).optional().describe('Testo nella descrizione'),
        }),
        execute: async input => {
          const rows = await listReports({ ...input, status: input.status ?? ['open', 'in_progress'] })
          return { count: rows.length, reports: rows.slice(0, 50).map(compact) }
        },
      }),
      reports_by_zone: tool({
        description: 'Conta le segnalazioni aperte per CAP, la zona più colpita per prima.',
        inputSchema: z.object({ category: z.array(z.enum(SLUGS)).optional() }),
        execute: async ({ category }) => {
          const rows = await listReports({ status: ['open', 'in_progress'], category })
          const byCap: Record<string, number> = {}
          for (const r of rows) byCap[r.cap] = (byCap[r.cap] ?? 0) + 1
          return {
            zones: Object.entries(byCap)
              .map(([cap, open]) => ({ cap, open, href: `/segnalazioni?cap=${cap}` }))
              .sort((a, b) => b.open - a.open)
              .slice(0, 20),
          }
        },
      }),
      get_report: tool({
        description: 'Il dettaglio di una segnalazione con interventi e missioni collegati.',
        inputSchema: z.object({ id: uuidSchema }),
        execute: async ({ id }) => {
          const r = await getReport(id)
          return r
            ? { found: true as const, ...compact(r), interventions: r.interventions, missions: r.missions }
            : { found: false as const }
        },
      }),
      report_kpis: tool({
        description:
          'I numeri delle segnalazioni: aperte, in lavorazione, risolte in 30 giorni, aperte da POD.',
        inputSchema: z.object({}),
        execute: async () => getReportKpis(),
      }),
    }
    const tools: Record<string, unknown> = { ...read }
    if (hasLevel(ctx.access.tasks, 'write')) {
      tools.propose_create_intervention = proposalTool(
        'create_intervention',
        'Propone un intervento sul campo che risolve una segnalazione.',
        interventionSchema,
        input => ({
          title: 'Crea intervento',
          summary: [
            `Titolo: ${input.title}`,
            input.dueDate ? `Scadenza: ${formatDateIt(input.dueDate)}` : 'Scadenza: nessuna',
            'La segnalazione passa «In lavorazione».',
          ],
        })
      )
    }
    if (hasLevel(ctx.access.missioni, 'admin')) {
      tools.propose_publish_mission = proposalTool(
        'publish_mission',
        'Propone di offrire una segnalazione ai volontari come missione.',
        missionSchema,
        input => ({
          title: 'Pubblica missione',
          summary: [`Titolo: ${input.title}`, 'Compare nella bacheca dei volontari.'],
        })
      )
    }
    return tools as ReturnType<ModuleAi['tools']>
  },
  proposals: {
    create_intervention: defineProposal({
      label: 'Crea intervento',
      schema: interventionSchema,
      run: async input => {
        const result = await createIntervention(input)
        return result.ok ? ok({ href: `/tasks/${result.data.id}` }) : result
      },
    }),
    publish_mission: defineProposal({
      label: 'Pubblica missione',
      schema: missionSchema,
      run: async input => {
        const result = await publishMission(input)
        return result.ok ? ok({ href: `/missioni/${result.data.id}` }) : result
      },
    }),
  },
}
