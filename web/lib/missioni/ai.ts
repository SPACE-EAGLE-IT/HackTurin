import { tool } from 'ai'
import { z } from 'zod'

import { hasLevel } from '@/lib/access/types'
import { ok } from '@/lib/action-result'
import { defineProposal, type ModuleAi, proposalTool } from '@/lib/ai/registry'
import { categoryName } from '@/lib/civic/categories'
import { uuidSchema } from '@/lib/validation'

import { takeMission, verifyMission } from './actions'
import { listMissions } from './queries'
import { MISSION_STATUS_LABEL, type MissionListItem } from './types'

const missionIdSchema = z.object({
  id: uuidSchema.describe('Id della missione, da list_open_missions o my_missions'),
  title: z.string().max(200).optional().describe('Titolo della missione, per il riepilogo'),
})

function compact(mission: MissionListItem) {
  return {
    id: mission.id,
    title: mission.title,
    status: MISSION_STATUS_LABEL[mission.status],
    cap: mission.cap,
    category: mission.category ? categoryName(mission.category) : null,
    dueDate: mission.due_date,
    volunteer: mission.volunteer?.full_name ?? null,
    href: `/missioni/${mission.id}`,
  }
}

export const missioniAi: ModuleAi = {
  key: 'missioni',
  description:
    'Missioni dei volontari: missioni disponibili, le mie missioni; proposte di prendere una missione e (per chi gestisce) di verificarla. I volontari non sono pagati: ricevono solo rimborsi spese.',
  examples: ['Quali missioni sono disponibili?', 'A che punto sono le mie missioni?'],
  tools: ctx => {
    const level = ctx.access.missioni
    if (!hasLevel(level, 'read')) return {}
    const read = {
      list_open_missions: tool({
        description: 'Elenca le missioni disponibili (aperte e non assegnate), con CAP e categoria.',
        inputSchema: z.object({ cap: z.string().max(5).optional().describe('Filtra per CAP') }),
        execute: async ({ cap }) => {
          const rows = (await listMissions('disponibili', ctx.profileId)).filter(m => !cap || m.cap === cap)
          return { count: rows.length, missions: rows.slice(0, 50).map(compact) }
        },
      }),
      my_missions: tool({
        description: 'Le missioni della persona: in corso, inviate, verificate o respinte.',
        inputSchema: z.object({}),
        execute: async () => {
          const rows = await listMissions('mie', ctx.profileId)
          return { count: rows.length, missions: rows.slice(0, 50).map(compact) }
        },
      }),
    }
    if (!hasLevel(level, 'write')) return read
    const tools = {
      ...read,
      propose_take_mission: proposalTool(
        'take_mission',
        'Propone alla persona di prendere una missione disponibile.',
        missionIdSchema,
        input => ({
          title: 'Prendi missione',
          summary: [
            input.title ? `Missione: ${input.title}` : 'Missione indicata',
            'Diventerà tua, in corso',
          ],
        })
      ),
    }
    if (!hasLevel(level, 'admin')) return tools
    return {
      ...tools,
      list_missions_to_verify: tool({
        description: 'Elenca le missioni inviate dai volontari e in attesa di verifica.',
        inputSchema: z.object({}),
        execute: async () => {
          const rows = await listMissions('verifica', ctx.profileId)
          return { count: rows.length, missions: rows.slice(0, 50).map(compact) }
        },
      }),
      propose_verify_mission: proposalTool(
        'verify_mission',
        'Propone di verificare una missione inviata (la segnalazione collegata diventa risolta).',
        missionIdSchema,
        input => ({
          title: 'Verifica missione',
          summary: [
            input.title ? `Missione: ${input.title}` : 'Missione indicata',
            'La segnalazione collegata sarà segnata come risolta',
          ],
        })
      ),
    }
  },
  proposals: {
    take_mission: defineProposal({
      label: 'Prendi missione',
      schema: missionIdSchema,
      run: async ({ id }) => {
        const result = await takeMission(id)
        return result.ok ? ok({ href: `/missioni/${id}` }) : result
      },
    }),
    verify_mission: defineProposal({
      label: 'Verifica missione',
      schema: missionIdSchema,
      run: async ({ id }) => {
        const result = await verifyMission(id)
        return result.ok ? ok({ href: `/missioni/${id}` }) : result
      },
    }),
  },
}
