# Refactor to the design system

How to bring a screen built outside the system (plain Tailwind, another UI library, generated code) onto
the IAMAimpresa components. It is a mechanical pass; the prompt `prompts/refactor-to-ds.md` drives it.

## The pass

1. `pnpm check` — the findings are the worklist (codes below).
2. **Structure first**: make the screen `PageHeader → bands → overlays` inside the shell. Move the primary
   action to the header, last on the right; demote every other button to `outline`/`ghost`.
3. **Replace by table** (below): each hand-made element becomes a component. Delete the CSS it carried.
4. **States**: add the empty state and the `loading.tsx` skeleton if missing.
5. **Tokens**: replace every raw colour with the semantic utility that means the same thing.
6. **Copy**: labels become property names, buttons say their verb.
7. `pnpm check` again, then look at the screen once at 1440 and 390 px.

## Codes printed by `pnpm check`

| Code | Replace with |
|---|---|
| `HEX`, `PALETTE` | a semantic token: surfaces `bg-background` / `bg-card` / `bg-muted`; text `text-foreground` / `text-muted-foreground`; state `bg-success` `bg-warning` `bg-destructive` `bg-info` (and their `text-*`, `border-*`); identity `bg-tag-1..5`; charts `chart-*` |
| `DARK` | remove the `dark:` variant: the token already switches |
| `SURFACE` | `SectionCard` (titled) or `Card` |
| `H1` | `PageHeader` |
| `TABLE` | `DataTable` + `MobileRow` |
| `CONFIRM` | `ConfirmDialog` |
| `ANY` | the real type (`Tables<'…'>`, a `Pick`, a union) |
| `PX_TEXT` | `text-xs` … `text-2xl` |

## Replacement table

| Hand-made or foreign | IAMAimpresa |
|---|---|
| `<button className="…">`, MUI `Button`, Bootstrap `.btn` | `Button` with `variant` (`default` only for the one primary) |
| icon button without text | `BottoneIcona` (label becomes `aria-label` + tooltip) |
| card / panel / box | `SectionCard` (titled) · `Card` · `PannelloScheda` (label-value rows) |
| page title block | `PageHeader` (`title`, `description`, `actions`, `badges`, `meta`) |
| stat / counter tile | `KpiCard` inside `KpiGrid` |
| progress bar | `MeterRow` · `Anello` |
| badge / pill / chip for a status | `StatusBadge` with a `tone` |
| tag chip | `TagChip` |
| avatar + name | `RiferimentoEntita` (`tipo='utente'`) |
| `<table>`, DataGrid, list of rows | `DataTable` (desktop) + `MobileRow` (phone) |
| search input + filter dropdowns | `FacetToolbar` with `FacetSpec`s; state in the URL (`useUrlState`) |
| sort select | `SortMenu` or column header sorting |
| modal / `Dialog` with custom footer | `DialogoAzione` (`natura` sets the width; footer built in) |
| wizard | `DialogoPassi` |
| `window.confirm`, "Are you sure?" modal | `ConfirmDialog` |
| drawer / side panel | `PannelloLaterale` (desktop) — the component becomes a `Sheet` on phones |
| dropdown of row actions | `MenuAzioni` + `DropdownMenuItem` |
| form row with label | `PropertyField` inside `FormGrid` |
| `<select>` | `Scelta` (searchable when the list can grow) · `Select` only for tiny fixed lists |
| date input | `DateTrigger` |
| number input | `NumberField` |
| checkbox used as a yes/no setting | `Interruttore` |
| toast / snackbar / alert banner | `toast` (sonner) · `toastConAnnulla` · `Avviso` for an inline notice |
| "No data" text | `EmptyState` |
| spinner on a page | the route's `loading.tsx` with skeletons; `Spinner` only inside a button |
| tabs for sections of a page | `Tabs` (underline), state in `?tab=` |
| toggle between two views | `ToggleGroup` pills, state in `?vista=` |
| `<a>` back | `BackLink` |
| chart with its own colours | recharts inside `ChartCard`, colours from `SERIE` / `TINTE` |

## Coming from another UI library

- Remove its provider/theme wrapper and its CSS import; the tokens in `app/globals.css` are the theme.
- Map its spacing props to `gap-4` / `space-y-6`; drop custom breakpoints.
- Icons: `lucide-react` only; delete other icon sets.
- Replace global state used for filters with the URL (`useUrlState`).
- Keep the data layer: the refactor is on the screen, not on the queries.

## Keep the gains

A screen stays on the system when `pnpm check` is green, when the sheet in `COMPONENTS.md` is the only
source of components, and when a new need is solved by adding **one** component to `components/<module>/`
built with the tokens, not by writing classes in a page.
