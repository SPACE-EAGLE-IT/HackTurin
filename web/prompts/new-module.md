# New module

Use when: a new entity with its own table, access rows, list, detail and creation (clienti, fatture, eventi…).

**Brief** (fill in, then paste the whole file):

- Entity: `<things>` (plural, English snake_case: it becomes the table and the feature key)
- Fields: `<name: type, required?>`, … (only one required field)
- Relations: <belongs to a project / a person / …>
- Default access level: read | write
- Italian names: singular «…», plural «…»

---

Create the module described in the brief, mirroring the Task module file by file.

1. Migration `supabase/migrations/<YYYYMMDDHHMMSS>_<things>.sql` following `docs/DATABASE.md` §6: enum types
   if any; the table with `id`, `created_at`, `updated_at`, checks, foreign keys with `on delete`, indexes and a
   comment; the `set_updated_at` trigger; RLS enabled with the four policies through
   `has_access('<things>', …)`; `insert into public.features (key, name, description, default_level, sort_order)`.
2. Types: regenerate `lib/supabase/database.types.ts` (command in `docs/DATABASE.md` §4) or add the table by
   hand with the same shape; then `lib/<things>/types.ts` with the Italian labels and the `StatusBadge` tones.
3. `lib/<things>/queries.ts` (list with filters, get) and `lib/<things>/actions.ts` (create, update, delete)
   with the exact pattern of `lib/tasks/queries.ts` and `lib/tasks/actions.ts`.
4. Navigation: the entry in `lib/navigation.ts` with a lucide icon.
5. Assistant: `lib/<things>/ai.ts` with the read tools and the proposals (template in `docs/AI.md`), listed in
   `lib/ai/modules.ts`. `pnpm check` fails without it.
6. Routes: `app/(app)/<things>/page.tsx` + `loading.tsx` (`PageHeader` with the primary «Nuova …», a KPI band if
   meaningful, `FacetToolbar` + `DataTable`/`MobileRow`); `[id]/page.tsx` + `loading.tsx` (`BackLink`,
   `PageHeader` with badges and meta, `PannelloScheda` of editable properties);
   `components/<things>/new-<thing>-dialog.tsx` (`DialogoAzione natura='creazione'`, `FormGrid`, one required field).
7. `pnpm check`; open list and detail once at 1440 and at 390 px.

Everything in English except UI strings. No new dependencies. Report the files created, one per line.
