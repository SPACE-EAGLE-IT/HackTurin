import type { Tool } from 'ai'
import { tool } from 'ai'
import type { z } from 'zod'

import type { AccessMap } from '@/lib/access/types'
import type { ActionResult } from '@/lib/action-result'

import type { Proposal } from './types'

/** What a module's tools know about the person asking. */
export type AiToolContext = {
  profileId: string
  access: AccessMap
  /** `YYYY-MM-DD`, Europe/Rome. */
  today: string
}

/** A proposal kind: how to validate its input and which server action runs it when the person confirms. */
export type ProposalDefinition<I = unknown> = {
  label: string
  schema: z.ZodType<I>
  run: (input: I) => Promise<ActionResult<{ href?: string }>>
}

/**
 * The link between a module and the assistant. Every module with server actions exports one of these
 * from `lib/<module>/ai.ts` and lists it in `MODULE_AI` below; `pnpm check` enforces it.
 *
 * Tools READ through the user's own session (RLS applies) or PROPOSE: no tool ever writes.
 * A write happens only when the person confirms a proposal, through the module's server action.
 */
export type ModuleAi = {
  key: string
  /** One line for the system prompt: what the assistant can do in this module. */
  description: string
  /** Prompts shown as suggestions when the chat is empty. */
  examples: string[]
  tools: (ctx: AiToolContext) => Record<string, Tool>
  proposals: Record<string, AnyProposalDefinition>
}

/** A proposal definition whose input type has been erased; built with `defineProposal`. */
export type AnyProposalDefinition = {
  label: string
  schema: z.ZodType
  run: (input: never) => Promise<ActionResult<{ href?: string }>>
}

/** Keeps the module's input type while it is written, erases it for the registry. */
export function defineProposal<I>(definition: ProposalDefinition<I>): AnyProposalDefinition {
  return definition as unknown as AnyProposalDefinition
}

/** Builds a tool that returns a proposal instead of acting. */
export function proposalTool<I>(
  kind: string,
  description: string,
  schema: z.ZodType<I>,
  describe: (input: I) => { title: string; summary: string[] }
): Tool {
  return tool({
    description: `${description} Non esegue nulla: restituisce una proposta che la persona può confermare.`,
    inputSchema: schema,
    execute: async (input: I): Promise<{ proposal: Proposal<I> }> => ({
      proposal: { kind, ...describe(input), input },
    }),
  })
}

export function isProposalOutput(output: unknown): output is { proposal: Proposal } {
  return typeof output === 'object' && output !== null && 'proposal' in output
}
