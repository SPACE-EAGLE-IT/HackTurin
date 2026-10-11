# Stack — Next.js, Supabase, Vercel

What each layer does in this kit, how it is wired, and how to deploy it.

## Next.js 16 (App Router)

- **Server Components by default.** A `page.tsx` is an async function that reads data
  (`lib/<module>/queries.ts`) and renders. No `useEffect` to fetch.
- **Client Components** (`'use client'`) only where there is interaction: forms, filters, menus, the board.
  They receive data as props and call **Server Actions** (`lib/<module>/actions.ts`, `'use server'`).
- **Server Actions** are the only write path. They validate with zod, check access, write with the user's
  Supabase client, call `revalidatePath()` for the routes that changed and return an `ActionResult`.
  Client code wraps the call in `useTransition` to show pending state.
- **Routing**: `app/(app)/<module>/page.tsx` for a list, `[id]/page.tsx` for a detail. The `(app)` group
  carries the shell and the session check in its `layout.tsx`. Every route folder has a `loading.tsx`
  (skeleton) and the group has an `error.tsx`.
- **`proxy.ts`** (the file Next 16 calls what used to be `middleware.ts`) refreshes the Supabase session
  cookie on each request and redirects anonymous visitors to `/login`.
- **`searchParams`** are a Promise in Next 16: `const params = await props.searchParams`.
- **Styling**: Tailwind v4, CSS-first. There is no `tailwind.config`: the tokens are declared in
  `styles/tokens.css` with `@theme` and become utilities (`bg-success`, `text-muted-foreground`).
- **Fonts**: Geist and Geist Mono via `@fontsource-variable`, imported in `app/globals.css`.
- **Dark mode**: `next-themes` toggles the `dark` class; the colours switch inside the tokens.
- **AI**: the AI SDK (`ai`, `@ai-sdk/react`) with provider packages for Anthropic, OpenAI, Google and
  OpenAI-compatible endpoints; the chat route is `app/api/chat/route.ts`. See [AI.md](AI.md).

## Supabase

- **Postgres** with the schema in `supabase/migrations/` (see [DATABASE.md](DATABASE.md)). One migration,
  no data to load.
- **Auth**: e-mail and password. The first user to sign up becomes admin. A person added by an admin is
  linked to the account that signs up with the same e-mail.
- **Row Level Security** on every table; the app uses the **publishable key** and acts as the user.
  The service role key is never used.
- **Client**: `lib/supabase/server.ts` (Server Components, actions, route handlers), from `@supabase/ssr`,
  which stores the session in cookies. A browser client is not needed: every read and write goes through the
  server. Add one with `createBrowserClient` from `@supabase/ssr` only for realtime subscriptions.
- **Types**: `lib/supabase/database.types.ts` is generated from the schema; `Tables<'tasks'>` and
  `Enums<'task_status'>` give row and enum types.

### Create the project (about three minutes)

1. [supabase.com](https://supabase.com) → *New project*. Choose a region close to the users.
2. *SQL Editor* → paste each file of `supabase/migrations/` in order (schema, then assistant) → *Run*.
3. *Authentication → Providers → Email*: for a hackathon, turn **off** "Confirm email" so sign-up is immediate.
   (With it on, the confirmation link lands on `/auth/callback`, which the kit handles.)
4. *Authentication → URL Configuration*: set *Site URL* to your deployment URL and add
   `http://localhost:3000/**` and your Vercel URLs to *Redirect URLs*.
5. *Project Settings → API Keys*: copy the project URL and the **publishable** key into `.env.local`.

## Vercel

1. Push the repository to GitHub and import it on [vercel.com](https://vercel.com). Framework: Next.js.
   No build settings to change (`pnpm build`).
2. *Environment Variables*: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and
   `NEXT_PUBLIC_SITE_URL` set to the production URL (used for auth redirects). For the assistant in
   production also `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY` (and `AI_BASE_URL` for compatible endpoints), so the
   key never leaves the server.
3. Every branch gets a preview URL; add `https://*-<team>.vercel.app/**` to Supabase *Redirect URLs*
   if previews must sign in.
4. Merging to the production branch deploys production.

## Local development

```bash
pnpm install
cp .env.example .env.local      # fill in the two Supabase values
pnpm dev                        # http://localhost:3000
pnpm check                      # typecheck + style scan
```

Optional local Supabase stack (needs Docker): `supabase start`, then `supabase db reset` applies the
migrations; point `.env.local` at the local URL and key printed by the CLI.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| "Missing NEXT_PUBLIC_SUPABASE_URL…" | `.env.local` is missing or the dev server was started before it existed: restart `pnpm dev`. |
| Sign-up says "check your e-mail" | E-mail confirmation is on in Supabase. Turn it off for the hackathon, or click the link. |
| Login works locally but not on Vercel | The Vercel URL is not in Supabase *Redirect URLs*, or `NEXT_PUBLIC_SITE_URL` is wrong. |
| A page shows "Accesso non consentito" | The person holds `none` on that feature. An admin changes it in *Accessi*. |
| Nothing shows after sign-up | No profile was created: the `on_auth_user_created` trigger is missing — re-run the migration. |
| Types out of date after a schema change | `supabase gen types typescript --project-id <ref> --schema public > lib/supabase/database.types.ts` |
