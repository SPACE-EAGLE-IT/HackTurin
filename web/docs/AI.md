# The assistant — chat over your data, proposals you confirm

The assistant is a panel docked on the right of every page (the disc in the bottom-right corner opens it; on phones the button in the header) and a full page on `/assistant`. It answers from the
person's own data and turns requests for changes into **proposals** the person confirms. It works with any
provider and is configured in three minutes from `/assistant/setup`.

## The law

1. **A tool reads or proposes. No tool writes.** Reads run through the user's own Supabase session, so RLS
   applies exactly as in the UI. A write happens only when the person confirms a proposal, and then through the
   module's ordinary server action (`requireAccess` → write as the user → `revalidatePath`).
2. **Every call to a paid model leaves a row** in `ai_calls`: who, which model, how many tokens, how long.
   `/assistant/setup` shows the month.
3. **The key is never in a plain table.** It lives in Supabase Vault; `ai_settings_for_chat()` hands it to the
   server for people who hold `read` on the `ai` feature. Anyone who can use the chat could also read the key
   through the API: that is the deal of a team. For a public deployment set the environment variables below,
   which win over the database and never leave the server.
4. **Every module with server actions is linked to the assistant.** `pnpm check` fails otherwise
   (`MODULE_WITHOUT_AI`, `MODULE_NOT_REGISTERED`).

## How it is wired

```
app/api/chat/route.ts        streams the answer; persists messages; logs the call
lib/ai/provider.ts           one function → a model for Anthropic, OpenAI, Google or any OpenAI-compatible endpoint
lib/ai/settings.ts           env vars, else Vault through the RPCs
lib/ai/registry.ts           the contract a module implements (ModuleAi, proposalTool, defineProposal)
lib/ai/modules.ts            the list of linked modules
lib/<module>/ai.ts           the module's tools and proposals
lib/ai/actions.ts            confirmProposal, conversations, saveAiSettings, testAiSettings
components/assistant/        the chat (panel and page), proposal cards, the setup wizard
```

The chat uses the AI SDK (`ai`, `@ai-sdk/react`): `useChat` on the client, `streamText` with tools on the
server, up to six tool steps per answer. Messages are stored as the UI parts the SDK produces, so a
conversation reopens exactly as it was shown.

## Configure a provider

`/assistant/setup` (admins): choose the provider, paste the key, type the model id, press «Prova il modello»,
save. Presets:

| Provider | Base URL | Model id examples |
|---|---|---|
| Anthropic | fixed | `claude-sonnet-5-5`, `claude-haiku-4-5-20251001` |
| OpenAI | fixed | see the provider's model list |
| Google | fixed | `gemini-2.5-flash` |
| OpenAI-compatible | required: Groq `https://api.groq.com/openai/v1`, OpenRouter `https://openrouter.ai/api/v1`, Ollama `http://localhost:11434/v1`, … | the provider's id |

Environment override (production): `AI_PROVIDER` (`anthropic` · `openai` · `google` · `openai_compatible`),
`AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL` (compatible endpoints only). When set, the wizard shows them as read-only.

## Link a module — required for every new module

Create `lib/<module>/ai.ts` exporting a `ModuleAi`, then add it to `MODULE_AI` in `lib/ai/modules.ts`.

```ts
import { tool } from 'ai'
import { z } from 'zod'
import { hasLevel } from '@/lib/access/types'
import { ok } from '@/lib/action-result'
import { defineProposal, type ModuleAi, proposalTool } from '@/lib/ai/registry'

const createSchema = z.object({ name: z.string().trim().min(1).max(160) })

export const thingsAi: ModuleAi = {
  key: 'things',
  description: 'Cose: elenco e dettaglio; proposta di creazione.',
  examples: ['Quante cose abbiamo?'],
  tools: ctx => {
    if (!hasLevel(ctx.access.things, 'read')) return {}
    const read = {
      list_things: tool({
        description: 'Elenca le cose.',
        inputSchema: z.object({ q: z.string().max(80).optional() }),
        execute: async ({ q }) => ({ things: (await listThings({ q })).map(t => ({ id: t.id, name: t.name, href: `/things/${t.id}` })) }),
      }),
    }
    if (!hasLevel(ctx.access.things, 'write')) return read
    return {
      ...read,
      propose_create_thing: proposalTool('create_thing', 'Propone una nuova cosa.', createSchema, input => ({
        title: 'Crea cosa',
        summary: [`Nome: ${input.name}`],
      })),
    }
  },
  proposals: {
    create_thing: defineProposal({
      label: 'Crea cosa',
      schema: createSchema,
      run: async input => {
        const result = await createThing(input)
        return result.ok ? ok({ href: `/things/${result.data.id}` }) : result
      },
    }),
  },
}
```

Rules for tools: return compact objects (ids, names, labels in Italian, an `href` when the entity has a page),
cap lists at 50 rows, gate on the feature level, never call a server action from a tool. Rules for proposals:
the `kind` is unique across modules, the `summary` says what will happen in the person's words, `run` calls the
module's own action and returns `{ href }` so the card can link to the result.

## Fair use

The chat endpoint allows 30 calls per person every 10 minutes and 20 000 characters per request; beyond that it
answers `429` or `413` with a message the chat shows. The constants are at the top of `app/api/chat/route.ts`.

## Tables

`ai_settings` (one row, key in Vault, reachable only through `ai_settings_save`, `ai_settings_status`,
`ai_settings_for_chat`) · `ai_conversations` and `ai_messages` (private to their owner) · `ai_calls` (own rows,
admins see all). Feature key: `ai`, default level `write`.

## Copy

The assistant speaks Italian, briefly, with the vocabulary of the platform: «task», «commessa», «in ritardo».
It cites entities by name with their link, never invents ids, and after a proposal says in one line what the
confirmation will do. The system prompt is `lib/ai/prompt.ts`.
