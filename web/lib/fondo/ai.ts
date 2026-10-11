import { tool } from 'ai'
import { z } from 'zod'

import { hasLevel } from '@/lib/access/types'
import { ok } from '@/lib/action-result'
import { defineProposal, type ModuleAi, proposalTool } from '@/lib/ai/registry'
import { uuidSchema } from '@/lib/validation'

import { markReimbursed } from './actions'
import { getFundKpis, listExpensesToReimburse } from './queries'
import { euro } from './types'

const markSchema = z.object({
  ids: z.array(uuidSchema).min(1).max(500).describe('Id delle spese da segnare rimborsate, da fund_summary'),
})

export const fondoAi: ModuleAi = {
  key: 'fondo',
  description:
    'Fondo dell’associazione partner: donazioni raccolte, rimborsi spese ai volontari pagati e da pagare, zone adottate; proposta di segnare spese come rimborsate.',
  examples: ['Quanto abbiamo raccolto e quanto resta da rimborsare?', 'Quali rimborsi sono da pagare?'],
  tools: ctx => {
    if (!hasLevel(ctx.access.fondo, 'read')) return {}
    const read = {
      fund_summary: tool({
        description:
          'Riepilogo del fondo: raccolto, rimborsato, da rimborsare, zone adottate, e le spese da rimborsare per volontario.',
        inputSchema: z.object({}),
        execute: async () => {
          const [kpis, expenses] = await Promise.all([getFundKpis(), listExpensesToReimburse()])
          const byVolunteer = new Map<string, { volunteer: string; total: number; count: number }>()
          for (const row of expenses) {
            const key = row.volunteer?.id ?? 'n/d'
            const entry = byVolunteer.get(key) ?? {
              volunteer: row.volunteer?.full_name ?? '—',
              total: 0,
              count: 0,
            }
            entry.total += row.amount
            entry.count++
            byVolunteer.set(key, entry)
          }
          return {
            raised: euro(kpis.raised),
            donations: kpis.donors,
            reimbursed: euro(kpis.reimbursed),
            toReimburse: euro(kpis.toReimburse),
            zonesAdopted: kpis.zonesAdopted,
            volunteers: [...byVolunteer.values()].map(v => ({ ...v, total: euro(v.total) })),
            expenses: expenses.slice(0, 50).map(row => ({
              id: row.id,
              volunteer: row.volunteer?.full_name ?? null,
              date: row.spent_on,
              amount: euro(row.amount),
              mission: row.mission?.title ?? null,
            })),
            href: '/fondo',
          }
        },
      }),
    }
    if (!hasLevel(ctx.access.fondo, 'write')) return read
    return {
      ...read,
      propose_mark_reimbursed: proposalTool(
        'mark_reimbursed',
        'Propone di segnare come rimborsate le spese indicate.',
        markSchema,
        input => ({
          title: 'Segna spese rimborsate',
          summary: [`Spese: ${input.ids.length}`, 'Saranno registrate come pagate dall’associazione oggi'],
        })
      ),
    }
  },
  proposals: {
    mark_reimbursed: defineProposal({
      label: 'Segna spese rimborsate',
      schema: markSchema,
      run: async ({ ids }) => {
        const result = await markReimbursed(ids)
        return result.ok ? ok({ href: '/fondo' }) : result
      },
    }),
  },
}
