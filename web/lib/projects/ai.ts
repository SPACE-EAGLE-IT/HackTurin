import { tool } from 'ai'
import { z } from 'zod'

import { hasLevel } from '@/lib/access/types'
import { ok } from '@/lib/action-result'
import { defineProposal, type ModuleAi, proposalTool } from '@/lib/ai/registry'
import { dateKeySchema, uuidSchema } from '@/lib/validation'

import { createProject, updateProject } from './actions'
import { getProject, listProjects } from './queries'
import { completionPercent, PROJECT_STATUS_LABEL, PROJECT_STATUSES, type ProjectListItem } from './types'

const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(160).describe('Nome della commessa'),
  clientName: z.string().max(160).optional(),
  ownerId: uuidSchema.optional().describe('Id del responsabile, da list_people'),
  dueDate: dateKeySchema.optional(),
  budgetHours: z.number().min(0).max(999999).optional(),
})

const setStatusSchema = z.object({ id: uuidSchema, status: z.enum(PROJECT_STATUSES) })

function compact(project: ProjectListItem) {
  return {
    id: project.id,
    code: project.code,
    name: project.name,
    client: project.client_name,
    status: PROJECT_STATUS_LABEL[project.status],
    dueDate: project.due_date,
    owner: project.owner?.full_name ?? null,
    tasksDone: project.progress.tasksDone,
    tasksTotal: project.progress.tasksTotal,
    tasksOverdue: project.progress.tasksOverdue,
    completion: `${completionPercent(project.progress)}%`,
    href: `/projects/${project.id}`,
  }
}

export const projectsAi: ModuleAi = {
  key: 'projects',
  description:
    'Commesse: elenco con avanzamento, dettaglio con note e budget; proposte di creazione e cambio stato.',
  examples: ['Com’è messa la commessa PRJ-001?', 'Quali commesse hanno task in ritardo?'],
  tools: ctx => {
    if (!hasLevel(ctx.access.projects, 'read')) return {}
    const read = {
      list_projects: tool({
        description: 'Elenca le commesse con il loro avanzamento.',
        inputSchema: z.object({
          status: z.array(z.enum(PROJECT_STATUSES)).optional(),
          q: z.string().max(80).optional().describe('Testo nel nome o nel codice'),
        }),
        execute: async input => {
          const rows = await listProjects({ status: input.status, q: input.q })
          return { count: rows.length, projects: rows.map(compact) }
        },
      }),
      get_project: tool({
        description: 'Il dettaglio di una commessa: note, budget ore, responsabile.',
        inputSchema: z.object({ id: uuidSchema }),
        execute: async ({ id }) => {
          const project = await getProject(id)
          if (!project) return { found: false as const }
          return {
            found: true as const,
            ...compact(project),
            notes: project.notes,
            budgetHours: project.budget_hours,
          }
        },
      }),
    }
    if (!hasLevel(ctx.access.projects, 'write')) return read
    return {
      ...read,
      propose_create_project: proposalTool(
        'create_project',
        'Propone una nuova commessa.',
        createProjectSchema,
        input => ({
          title: 'Crea commessa',
          summary: [
            `Nome: ${input.name}`,
            input.clientName ? `Cliente: ${input.clientName}` : 'Cliente: non indicato',
          ],
        })
      ),
      propose_set_project_status: proposalTool(
        'set_project_status',
        'Propone di cambiare lo stato di una commessa.',
        setStatusSchema,
        input => ({
          title: 'Cambia stato commessa',
          summary: [`Nuovo stato: ${PROJECT_STATUS_LABEL[input.status]}`],
        })
      ),
    }
  },
  proposals: {
    create_project: defineProposal({
      label: 'Crea commessa',
      schema: createProjectSchema,
      run: async input => {
        const result = await createProject(input)
        return result.ok ? ok({ href: `/projects/${result.data.id}` }) : result
      },
    }),
    set_project_status: defineProposal({
      label: 'Cambia stato commessa',
      schema: setStatusSchema,
      run: async ({ id, status }) => {
        const result = await updateProject(id, { status })
        return result.ok ? ok({ href: `/projects/${id}` }) : result
      },
    }),
  },
}
