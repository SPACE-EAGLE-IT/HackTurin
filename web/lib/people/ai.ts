import { tool } from 'ai'
import { z } from 'zod'

import type { ModuleAi } from '@/lib/ai/registry'

import { listPeople } from './queries'

export const peopleAi: ModuleAi = {
  key: 'people',
  description: 'Persone: chi fa parte della squadra, con gli id da usare per assegnare task e commesse.',
  examples: ['Chi è nella squadra?'],
  tools: () => ({
    list_people: tool({
      description: 'Elenca le persone della squadra con il loro id.',
      inputSchema: z.object({}),
      execute: async () => ({
        people: (await listPeople()).map(person => ({ id: person.id, name: person.full_name })),
      }),
    }),
  }),
  proposals: {},
}
