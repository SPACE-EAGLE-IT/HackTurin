import { fondoAi } from '@/lib/fondo/ai'
import { helpDeskAi } from '@/lib/help-desk/ai'
import { missioniAi } from '@/lib/missioni/ai'
import { peopleAi } from '@/lib/people/ai'
import { podAi } from '@/lib/pod/ai'
import { projectsAi } from '@/lib/projects/ai'
import { segnalazioniAi } from '@/lib/segnalazioni/ai'
import { tasksAi } from '@/lib/tasks/ai'

import type { AiToolContext, AnyProposalDefinition, ModuleAi } from './registry'

/** Every module linked to the assistant. A new module adds its `lib/<module>/ai.ts` here. */
export const MODULE_AI: readonly ModuleAi[] = [
  segnalazioniAi,
  tasksAi,
  projectsAi,
  podAi,
  helpDeskAi,
  missioniAi,
  fondoAi,
  peopleAi,
]

export function assistantTools(ctx: AiToolContext) {
  return Object.assign({}, ...MODULE_AI.map(entry => entry.tools(ctx)))
}

export function findProposal(kind: string): AnyProposalDefinition | null {
  for (const entry of MODULE_AI) if (kind in entry.proposals) return entry.proposals[kind]
  return null
}

export function assistantExamples(): string[] {
  return MODULE_AI.flatMap(entry => entry.examples)
}
