import { tool } from 'ai'
import { z } from 'zod'

import { hasLevel } from '@/lib/access/types'
import { ok } from '@/lib/action-result'
import { defineProposal, type ModuleAi, proposalTool } from '@/lib/ai/registry'
import { formatDateIt } from '@/lib/format-date'
import { dateKeySchema, uuidSchema } from '@/lib/validation'

import { createTask, updateTask } from './actions'
import { getTask, getTaskKpis, listTasks } from './queries'
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  TASK_STATUSES,
  type TaskListItem,
} from './types'

const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).describe('Titolo della task'),
  description: z.string().max(4000).optional().describe('Descrizione, se la persona l’ha data'),
  projectId: uuidSchema.optional().describe('Id della commessa, da list_projects'),
  assigneeId: uuidSchema.optional().describe('Id della persona, da list_people'),
  priority: z.enum(TASK_PRIORITIES).optional(),
  dueDate: dateKeySchema.optional().describe('Scadenza YYYY-MM-DD'),
})

const setStatusSchema = z.object({ id: uuidSchema, status: z.enum(TASK_STATUSES) })
const assignSchema = z.object({ id: uuidSchema, assigneeId: uuidSchema.nullable() })

function compact(task: TaskListItem) {
  return {
    id: task.id,
    title: task.title,
    status: TASK_STATUS_LABEL[task.status],
    priority: TASK_PRIORITY_LABEL[task.priority],
    dueDate: task.due_date,
    project: task.project ? `${task.project.code} · ${task.project.name}` : null,
    assignee: task.assignee?.full_name ?? null,
    href: `/tasks/${task.id}`,
  }
}

export const tasksAi: ModuleAi = {
  key: 'tasks',
  description:
    'Task: elenco con filtri (stato, priorità, scadenza, commessa, persona), dettaglio e numeri; proposte di creazione, cambio stato e assegnazione.',
  examples: [
    'Cosa scade questa settimana?',
    'Quali task sono in ritardo e di chi sono?',
    'Crea una task «Preparare la demo» per venerdì, priorità alta',
  ],
  tools: ctx => {
    if (!hasLevel(ctx.access.tasks, 'read')) return {}
    const read = {
      list_tasks: tool({
        description: 'Elenca le task che corrispondono ai filtri, al massimo 50, ordinate per scadenza.',
        inputSchema: z.object({
          status: z.array(z.enum(TASK_STATUSES)).optional(),
          priority: z.array(z.enum(TASK_PRIORITIES)).optional(),
          due: z
            .enum(['overdue', 'today', 'week', 'none'])
            .optional()
            .describe('overdue = in ritardo, week = entro 7 giorni'),
          projectId: uuidSchema.optional(),
          assigneeId: uuidSchema.optional(),
          mine: z.boolean().optional().describe('Solo le task assegnate alla persona che chiede'),
          open: z.boolean().optional().describe('Escludi le task fatte'),
          q: z.string().max(80).optional().describe('Testo nel titolo'),
        }),
        execute: async input => {
          const rows = await listTasks({
            status: input.status,
            priority: input.priority,
            due: input.due,
            q: input.q,
            open: input.open,
            projectId: input.projectId ? [input.projectId] : undefined,
            assigneeId: input.assigneeId ? [input.assigneeId] : undefined,
            mine: input.mine ? ctx.profileId : undefined,
          })
          return { count: rows.length, tasks: rows.slice(0, 50).map(compact) }
        },
      }),
      get_task: tool({
        description: 'Il dettaglio di una task: descrizione, ore stimate, tag e numero di commenti.',
        inputSchema: z.object({ id: uuidSchema }),
        execute: async ({ id }) => {
          const task = await getTask(id)
          if (!task) return { found: false as const }
          return {
            found: true as const,
            ...compact(task),
            description: task.description,
            estimatedHours: task.estimated_hours,
            tags: task.tags,
            comments: task.comments.length,
            createdAt: task.created_at,
          }
        },
      }),
      task_kpis: tool({
        description: 'I numeri delle task: aperte, entro 7 giorni, in ritardo, fatte negli ultimi 30 giorni.',
        inputSchema: z.object({ mine: z.boolean().optional() }),
        execute: async ({ mine }) => getTaskKpis({ mine: mine ? ctx.profileId : undefined }),
      }),
    }
    if (!hasLevel(ctx.access.tasks, 'write')) return read
    return {
      ...read,
      propose_create_task: proposalTool(
        'create_task',
        'Propone una nuova task.',
        createTaskSchema,
        input => ({
          title: 'Crea task',
          summary: [
            `Titolo: ${input.title}`,
            input.priority ? `Priorità: ${TASK_PRIORITY_LABEL[input.priority]}` : 'Priorità: Media',
            input.dueDate ? `Scadenza: ${formatDateIt(input.dueDate)}` : 'Scadenza: nessuna',
          ],
        })
      ),
      propose_set_task_status: proposalTool(
        'set_task_status',
        'Propone di cambiare lo stato di una task.',
        setStatusSchema,
        input => ({
          title: 'Cambia stato',
          summary: [`Nuovo stato: ${TASK_STATUS_LABEL[input.status]}`],
        })
      ),
      propose_assign_task: proposalTool(
        'assign_task',
        'Propone di assegnare una task a una persona, o di togliere l’assegnazione.',
        assignSchema,
        input => ({
          title: input.assigneeId ? 'Assegna task' : 'Togli assegnazione',
          summary: [
            input.assigneeId ? 'La task passa alla persona indicata.' : 'La task resta senza assegnatario.',
          ],
        })
      ),
    }
  },
  proposals: {
    create_task: defineProposal({
      label: 'Crea task',
      schema: createTaskSchema,
      run: async input => {
        const result = await createTask(input)
        return result.ok ? ok({ href: `/tasks/${result.data.id}` }) : result
      },
    }),
    set_task_status: defineProposal({
      label: 'Cambia stato',
      schema: setStatusSchema,
      run: async ({ id, status }) => {
        const result = await updateTask(id, { status })
        return result.ok ? ok({ href: `/tasks/${id}` }) : result
      },
    }),
    assign_task: defineProposal({
      label: 'Assegna task',
      schema: assignSchema,
      run: async ({ id, assigneeId }) => {
        const result = await updateTask(id, { assigneeId })
        return result.ok ? ok({ href: `/tasks/${id}` }) : result
      },
    }),
  },
}
