# IAMAimpresa Kit

> Public during the IAMAimpresa hackathon so that participants can clone it without an invitation. It is
> licensed to participants only: no commercial use, no redistribution. See [LICENSE](LICENSE).

A starter kit for building business applications fast and well: **Next.js 16**, **Supabase** and the
**IAMAimpresa design system**, with a simplified task manager already in place — tasks, projects, people and
per-feature access control. Made for hackathons: one command to run, one file to paste into Supabase, four
prompts to extend it with a coding agent, and a single five-second check instead of review loops.

## What is inside

- **The design system** as source: tokens (`styles/tokens.css`), 40 primitives (`components/ui`) and more than 60 frames
  and composites (`components/ds`) — the same pieces the IAMAimpresa product is built with.
- **A working application**: sign in / sign up, dashboard, tasks (list, board, detail with comments), projects
  (commesse) with progress, a **Help desk** (tickets with categories, a conversation of replies and internal
  notes, take-over and resolution, a task created from a ticket), an **Access** module where admins decide who
  sees and edits each feature, and an **AI assistant** that answers from the data and proposes actions the person confirms, with a three-minute
  setup wizard for any provider (Anthropic, OpenAI, Google, OpenAI-compatible).
- **The database**: one migration with tables, triggers, Row Level Security and the feature registry.
  Apply it and the application is ready: no demo data to load or to clean up.
- **The method**: `docs/RULES.md` (how a screen is built), `docs/COMPONENTS.md` (the component API in one
  sheet), `docs/DATABASE.md`, `docs/AI.md` (how a module links to the assistant), `docs/STACK.md`,
  `docs/REFACTOR.md`, `docs/BRAND.md` (the marks and where they are mounted), and four ready-made prompts.

Code and documentation are English. UI copy is Italian, as are the names of the design-system components,
which are shared with the upstream product.

## Quick start

```bash
git clone <this repository> && cd iamaimpresa-kit
pnpm install
cp .env.example .env.local
```

1. Create a free project at [supabase.com](https://supabase.com).
2. In *SQL Editor* run the files in `supabase/migrations/`, in order (the schema, then the assistant).
3. In *Authentication → Providers → Email* turn off *Confirm email* (hackathon mode).
4. Copy the project URL and the **publishable** key from *Project Settings → API Keys* into `.env.local`.
5. `pnpm dev` → http://localhost:3000 → *Registrati*. **The first account created is admin.**

Details and deployment to Vercel: [docs/STACK.md](docs/STACK.md).

## Build with it

The loop is short on purpose: brief → compose with existing components → `pnpm check` → look once at 1440
and 390 px → done. No second review, no registries, no verification chains.

| Prompt (`prompts/`) | Claude Code skill | Use it when |
|---|---|---|
| `new-view.md` | `/new-view` | a new screen in an existing module |
| `new-module.md` | `/new-module` | a new entity: table, access rows, list, detail, creation |
| `refactor-to-ds.md` | `/refactor-to-ds` | a screen built outside the system must come onto it |
| `polish.md` | `/polish` | a screen works and must be finished |

Coding agents read `AGENTS.md` (Claude Code reads `CLAUDE.md`, which points to it). Humans start with
[docs/RULES.md](docs/RULES.md) and [docs/COMPONENTS.md](docs/COMPONENTS.md).

## Project structure

```
app/(app)/<module>/      routes: page.tsx (server), loading.tsx (skeleton), [id]/page.tsx
app/login, app/auth      sign in / sign up, e-mail confirmation callback
components/ui, ds        design system — vendored, do not edit
components/<module>/     client components of one module
lib/<module>/            types.ts · queries.ts · actions.ts ('use server')
lib/supabase, auth, access clients, session, requireAccess()
supabase/migrations/     the schema, one file per change
docs/, prompts/          the rules, the component sheet, the brand guide, the prompts
public/brand/            the IAMAimpresa marks: logotype, mark, icons, favicon, link preview, vector pack
scripts/check.mjs        typecheck + style scan (`pnpm check`)
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | development server |
| `pnpm check` | TypeScript + style scan (raw colours, `dark:`, hand-made surfaces, `<h1>`, `window.confirm`, `any`) + every module linked to the assistant |
| `pnpm test` | unit tests of the pure helpers (vitest) |
| `pnpm lint` · `pnpm format` | ESLint · Prettier |
| `pnpm build` · `pnpm start` | production build and server |

## Assistant in three lines

The chat reads through the person's own session (RLS applies) and never writes: it **proposes**, the person
confirms, the module's server action runs. Admins configure the provider once at `/assistant/setup`; the key is
kept in Supabase Vault (or in environment variables for production). Every module links its tools in
`lib/<module>/ai.ts`; `pnpm check` enforces it. Details: [docs/AI.md](docs/AI.md).

## Access model in three lines

`features` is the registry of modules; `feature_access` holds one row per person per feature with a level
(`none` < `read` < `write` < `admin`). Inserting a feature grants everyone its default level, inserting a
person grants them every feature; `has_access(feature, level)` is the one function policies and server actions
call. The first user to sign up is admin and manages levels from *Accessi*.

## Design system in three lines

Colour is meaning: components use semantic tokens only (`bg-card`, `text-muted-foreground`, `bg-success`,
`chart-*`), never raw palettes or `dark:`; the dark theme lives in the tokens. Every screen is
`PageHeader → bands → overlays`, with one primary action and three states. `docs/COMPONENTS.md` is the API;
`pnpm check` tells you when a screen drifts.

## Contributing

Keep the loop: small changes, `pnpm check` and `pnpm lint` green, Prettier formatting, English code, Italian
copy. A new dependency needs a reason in the commit message. The design-system folders are vendored: changes to
them go upstream, not here.

## Security

Every table has Row Level Security and the application only ever acts as the signed-in user with the publishable
key. API routes answer 401 without a session; auth redirects accept relative paths only; responses carry
baseline security headers; every server action validates its input with zod and checks the feature level. The
assistant's key lives in Supabase Vault (or in environment variables for production) and the chat endpoint is
rate-limited per person. Found something? See [SECURITY.md](SECURITY.md).

## License

Source-available for the participants of IAMAimpresa events: use and modify during the event and for your own
learning, no commercial use, no redistribution. Full terms in [LICENSE](LICENSE). © 2026 IAMAimpresa.
