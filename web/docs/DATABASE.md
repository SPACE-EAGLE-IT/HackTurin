# Database — how data is structured, protected and written

Stack: Supabase Postgres, Row Level Security (RLS), Server Actions. The schema is in
`supabase/migrations/`, the generated types in `lib/supabase/database.types.ts`. Applying the migration is
all it takes: the feature registry is part of it, so the application is ready without any data load.

## 1. Principles

- **One home for every piece of data.** Before adding a table or a column, look for where that data already
  lives. A module that needs another module's data references it (foreign key), it does not copy it.
- **Names are English `snake_case`**: tables plural (`tasks`), columns singular (`due_date`), foreign keys
  `<entity>_id`, booleans `is_*`, timestamps `*_at`. Enumerated values are English too; the Italian label lives in
  `lib/<module>/types.ts`.
- **Every table has** `id uuid primary key default gen_random_uuid()`, `created_at timestamptz not null default now()`
  and, when rows change, `updated_at` kept by the `set_updated_at` trigger.
- **Closed sets are enums** (`task_status`, `task_priority`, …). Shapes are `check` constraints
  (`length(trim(title)) between 1 and 200`). Foreign keys say what happens on delete (`cascade` for children,
  `set null` for references).
- **Index** every foreign key and every column lists filter on.
- `comment on table` says what the table is for. One sentence.
- Everything lives in schema `public`. Only the title of a record is required: everything else has a default or
  is optional, so creating something takes one field.

## 2. Access model

```
profiles ───< feature_access >─── features
   │ is_admin                       │ default_level
   └ user_id → auth.users           └ key: 'dashboard' | 'tasks' | 'projects' | 'access' | …
```

- `features` is the registry of modules. **Inserting a feature creates an access row for every profile** at the
  feature's `default_level` (trigger). **Inserting a profile creates a row for every feature** (trigger).
- Levels: `none` (hidden) < `read` (see) < `write` (create, edit, delete) < `admin` (manage the module).
- `public.has_access(feature, level)` is the single function policies and server actions rely on.
  Admins (`profiles.is_admin`) always pass. **The first person who signs up becomes admin.**
- An admin can add a person before they sign up (*Accessi → Aggiungi persona*); signing up with that e-mail
  links the account to the profile.

### Adding a feature

1. `insert into public.features (key, name, description, default_level, sort_order) values (…)` in a new migration.
2. Add the route and its nav item (`lib/navigation.ts`), gated with `requireAccess('<key>', 'read')`.
3. Protect its tables with policies that call `has_access('<key>', …)`.

## 3. Row Level Security

- RLS is **enabled on every table**. The anonymous role has no privileges at all (`revoke all … from anon`):
  nothing is readable without a session.
- The application reads and writes **as the signed-in user** with the publishable key. The service role key is
  never used by the app: RLS is the last line of defence, not an option.
- Policies are one per operation and named `"<table>: <what>"`. Reads check `read`, writes check `write`.
- Helper functions are `security definer` with `set search_path = ''` and read `(select auth.uid())`
  (the subselect lets Postgres cache the value per statement).
- A trigger guards what a policy cannot express (e.g. only admins change `is_admin`).

```sql
alter table public.things enable row level security;

create policy "things: read" on public.things
  for select to authenticated using (public.has_access('things', 'read'));
create policy "things: insert" on public.things
  for insert to authenticated with check (public.has_access('things', 'write'));
create policy "things: update" on public.things
  for update to authenticated
  using (public.has_access('things', 'write')) with check (public.has_access('things', 'write'));
create policy "things: delete" on public.things
  for delete to authenticated using (public.has_access('things', 'write'));
```

## 4. Migrations

- One file per change in `supabase/migrations/`, named `YYYYMMDDHHMMSS_what_it_does.sql`. An applied migration is
  never edited: write the next one.
- **Hosted project** (the hackathon default): open *SQL Editor* in the Supabase dashboard, paste each migration
  in order, run. Or, with the CLI linked (`supabase link`), `supabase db push`.
- **Local stack** (needs Docker): `supabase start`, then `supabase db reset` applies the migrations.
- After a schema change regenerate the types:

```bash
supabase gen types typescript --project-id <ref> --schema public > lib/supabase/database.types.ts
```

## 5. Reading and writing from the app

**Reads** are plain queries in `lib/<module>/queries.ts`, called from Server Components:

```ts
export async function listThings() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('things').select('id, name, created_at').order('created_at')
  if (error) throw error
  return data
}
```

**Writes** are server actions in `lib/<module>/actions.ts`:

```ts
'use server'

const schema = z.object({ name: z.string().trim().min(1, 'Il nome è obbligatorio').max(160) })

export async function createThing(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = schema.safeParse(input)
  if (!parsed.success) return fail('Controlla i campi', fieldErrorsOf(parsed.error))
  const denied = await requireAccess('things', 'write')
  if (denied) return denied
  const supabase = await createClient()
  const { data, error } = await supabase.from('things').insert(parsed.data).select('id').single()
  if (error) return fail('Salvataggio non riuscito')
  revalidatePath('/things')
  return ok({ id: data.id })
}
```

Rules: validate first, check access second, write as the user, revalidate the routes you changed, return
`ActionResult`. Never throw towards the UI; never trust `input`.

## 6. Adding a table — checklist

1. Migration: types, table with `id`/`created_at`/`updated_at`, checks, foreign keys, indexes, comment.
2. Triggers: `set_updated_at`; any invariant a policy cannot express.
3. RLS: enable, four policies through `has_access('<feature>', …)`.
4. `supabase gen types …`, then `lib/<module>/types.ts` with the Italian labels.
5. Queries, actions, routes.

## The Help desk's tables

`ticket_categories` (managed from the settings, `admin` level on `help_desk`), `tickets` (code `HD-0001`, status,
priority, requester inside or outside the team, assignee, project, the task created from it as a reference),
`ticket_messages` (`reply` for the requester, `note` for the team). Triggers keep `resolved_at`, `closed_at`
and `first_response_at` honest.

## The assistant's tables

`ai_settings` (provider, model, base URL; the key is a Vault secret and the table is reachable only through its
RPCs), `ai_conversations`, `ai_messages`, `ai_calls`. Their rules are in [AI.md](AI.md).

## Common mistakes

- A `select *` in a list: select the columns the screen shows.
- A policy with `using (true)` on a business table: it means "anyone signed in sees everything".
- Business logic in a trigger that should be a server action (triggers keep invariants, actions implement gestures).
- A column that duplicates another table's data "for convenience": it will diverge.
