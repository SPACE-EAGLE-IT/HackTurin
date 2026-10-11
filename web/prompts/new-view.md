# New view

Use when: a new screen (list, detail or dashboard) inside an existing module.

**Brief** (fill in, then paste the whole file):

- Route: `/<module>/<path>`
- Shows: <which records; which columns or fields>
- Gestures: <create · edit in place · delete · filter by …>
- Template: list | detail | dashboard | creation

---

Build the view described in the brief above, in this repository.

1. Read `docs/RULES.md`; grep `docs/COMPONENTS.md` for the components you will use. Do not read component sources.
2. Copy the structure of the nearest existing route: `app/(app)/tasks` for a list, `app/(app)/tasks/[taskId]`
   for a detail, `app/(app)/dashboard` for a dashboard.
3. Data: reuse `lib/<module>/queries.ts`. Add a query or an action there only if it is missing, with the pattern
   of `lib/tasks/actions.ts` (zod → `requireAccess` → write as the user → `revalidatePath` → `ActionResult`).
4. Compose: `PageHeader` (one primary, last on the right) → bands → `DataTable` + `MobileRow`, or
   `PannelloScheda` → overlays. List state in the URL with `useUrlState`. Three states: full, `EmptyState`,
   `loading.tsx`.
5. Italian UI copy: labels are property names, every button says its verb.
6. Run `pnpm check` and fix what it prints. Open the route once at 1440 and at 390 px.

Do not add dependencies, do not restyle other screens, do not write a report: list the files you touched, one per line.
