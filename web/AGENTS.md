# AGENTS.md — how to work in this repository

This is the **IAMAimpresa Kit**: a Next.js 16 + Supabase starter that ships the IAMAimpresa design system and a
simplified task manager (tasks, projects, people, access control). It is built for speed: one pass, no review
loops, screens composed from existing components. Code and documentation are English; UI copy is Italian.

## Read first — and nothing else

1. [docs/RULES.md](docs/RULES.md) — how a screen is built (8 KB, read whole).
2. [docs/COMPONENTS.md](docs/COMPONENTS.md) — the API of every component. **Grep it by name**; do not read
   `components/ds/*` or `components/ui/*` sources unless a prop you need is missing from the sheet.
3. [docs/DATABASE.md](docs/DATABASE.md) — only when you touch tables, policies or server actions.
4. [docs/AI.md](docs/AI.md) — when you create a module (it must be linked to the assistant) or touch the chat.
5. An existing module as the template: `app/(app)/tasks` + `lib/tasks` + `components/tasks`.

## Folder map

```
app/(app)/<module>/         routes: page.tsx (server), loading.tsx (skeleton), [id]/page.tsx
app/login                   sign in / sign up
components/ui, components/ds design system — vendored, do not edit
components/<module>/        client components of one module
lib/<module>/               types.ts · queries.ts (reads) · actions.ts (server actions) · ai.ts (tools and proposals for the assistant)
lib/supabase/               server client, generated database types
lib/auth, lib/access, lib/ai session helpers, requireAccess(), feature levels, the assistant (provider, registry, chat route)
supabase/migrations/        the schema, one file per change (features included)
docs/, prompts/             the rules, the component sheet, the ready-made prompts
scripts/check.mjs           the one check: typecheck + style grep
```

## The loop

1. **Brief**: one line that names the route, the data and the gesture.
2. **Template**: list, detail, dashboard or creation. Copy the structure of the nearest existing route.
3. **Compose** with the components named in the sheet. Three states (full, empty, loading). URL for filters.
4. **Data**: a query in `lib/<module>/queries.ts`, a server action in `lib/<module>/actions.ts`
   (zod → `requireAccess` → write with the user's client → `revalidatePath` → `{ ok }`).
   A new module also gets `lib/<module>/ai.ts` (read tools, proposals) listed in `lib/ai/modules.ts`.
5. `pnpm check`, then open the route once at 1440 and at 390 px.
6. Done. Do not add a second review, do not refactor what works, do not write a report.

## Token discipline

- Grep before you read; read files with line ranges; never dump a file longer than 300 lines.
- Do not open vendored components. Do not run the full typecheck after every edit: once at the end.
- No exploratory tours of the codebase: the folder map above is complete.
- Prefer editing an existing file over creating a new one; prefer a component from the sheet over a new one.

## How to answer in chat

- Reply in the language the person writes in (Italian for the hackathon teams), in plain words, no process jargon.
- At most five lines: what changed, where to look (the route or the file), the one thing to do next.
- If something essential is missing from the request, ask one question and stop. Otherwise decide, and say
  what you decided in one line.
- No code and no long lists in the reply: the code is in the files, the list is `pnpm check`.

## Code conventions

- TypeScript strict, no `any`, no `@ts-ignore`. English identifiers, English comments (one line, say why).
- Server Components by default; `'use client'` only where there is interaction.
- A Server Component never passes a function (an icon component, a handler) to a Client Component: put that
  markup in a client leaf. `EmptyState`, `KpiCard`, `SectionCard` are client.
- URL is the state of a list (`?q=`, `?stato=`, `?vista=`); `useTransition` for pending UI; no global stores.
- Every table has RLS; the app never uses the service role; secrets never enter the repository.
- Formatting is Prettier (`pnpm format`); lint must be clean (`pnpm lint`).
- A new dependency needs a one-line reason in the commit message.

## Commands

| Command | What it does |
|---|---|
| `pnpm dev` | development server on http://localhost:3000 |
| `pnpm check` | typecheck + style check (hex, raw palettes, `dark:`, hand-made surfaces) |
| `pnpm test` | unit tests of the pure helpers; add one next to a helper you write |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm build` | production build |

## Ready-made prompts (`prompts/`, also as Claude Code skills in `.claude/skills/`)

`new-view` · `new-module` · `refactor-to-ds` · `polish`

## Never

Raw colours or `dark:` on colours · boxes made of `rounded border bg-*` · `<h1>` outside `PageHeader` ·
`window.confirm` · a second primary button · the service role key · a table without RLS · an assistant tool
that writes · verification loops.
