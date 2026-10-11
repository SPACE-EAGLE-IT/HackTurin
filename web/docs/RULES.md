# Rules — how an IAMAimpresa screen is built

This is a contract, not a menu of options. Every choice below has already been made; a screen that does
something different is either a bug or a change to be made for every screen. Read it once, apply it always.
The components named here are documented in [COMPONENTS.md](COMPONENTS.md).

## 1. Anatomy of every screen

```
AppShell (given by the layout: sidebar + header, never rebuilt by a view)
└─ content: fluid, p-4 md:p-6, space-y-6
   ├─ PageHeader: title, optional description, actions on the right (the PRIMARY is the last one)
   ├─ Band 1 — numbers:  KpiGrid of KpiCard (each card filters the list below)
   ├─ Band 2 — visuals:  ChartCard (optional)
   ├─ Band 3 — data:     FacetToolbar + DataTable, full width (MobileRow on phones)
   └─ Overlays:          DialogoAzione · ConfirmDialog · PannelloLaterale, opened from the bands
```

The order of the bands is reading order (how is it going → why → the detail), not decoration.

Positions that never change:

- **One primary action at most**, always the last element on the right of the `PageHeader`. Zero is fine.
  Never inside a table, never at the bottom of the page.
- **Destructive actions are never primary**: `outline`/`ghost` with the `Trash2` icon and always a `ConfirmDialog`.
- **Local search** is the first element on the left of the list toolbar. **Filters** are one trigger («Filtri»)
  that opens one panel. Sorting lives outside the panel.
- **Toasts** bottom-right (sonner). **Breadcrumb** in the shell header only.
- **Back from a detail**: one `BackLink` to the list, which keeps its filters.

## 2. Tokens: colour is meaning

- Use only semantic utilities: `bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`,
  `border`, `bg-primary`, `text-destructive`, `bg-success`, `bg-warning`, `bg-info`, `bg-tag-1..5`, `chart-*`.
- **Never** hex values, **never** raw palettes (`bg-red-500`, `text-gray-600`), **never** `dark:` on colours:
  the dark theme lives in `styles/tokens.css`.
- Surfaces are neutral. Colour comes only from **state** (success · warning · destructive · info), **identity**
  (`tag-1..5`) and **data** (`chart-*`).
- Spacing: `gap-4` inside a band, `space-y-6` between bands. Inside forms the components already apply the
  rhythm (`FormGrid`, `PropertyField`). Do not pick `space-y-N` by eye between fields.
- Radius, shadow and typography come from components. The page title is set by `PageHeader`; body text is `text-sm`.

## 3. Composition is made of components, not classes

| You need | Use | Never |
|---|---|---|
| a box with background, border, radius | `SectionCard` (or `Card`) | `rounded border bg-card` written in a view |
| the page title | `PageHeader` | an `<h1>` with classes |
| a list of records | `DataTable` + `MobileRow` | a hand-made `<table>` or `<ul>` |
| a status | `StatusBadge` | a coloured pill written by hand |
| a confirmation | `ConfirmDialog` | `window.confirm` |
| an explanation | `InfoDot` / `Tooltip` | `title=` |
| an icon-only button | `BottoneIcona` | `<Button size='icon'>` without a label |
| a number against a target | `MeterRow` | a custom progress bar |
| an empty list | `EmptyState` | a blank area |
| a loading view | `DataTableSkeleton`, `KpiGridSkeleton`, `Skeleton` | a full-page spinner |

If a component is missing, build it **once** in `components/<module>/` with the tokens, then reuse it.

## 4. Three states, always

Every data view has **full**, **empty** and **loading**. If one is missing the view is not finished.

- Empty: `EmptyState` with a title and, if useful, an `outline` button. The primary action is not repeated there.
- Loading: a `loading.tsx` in every route folder with the skeleton of what will appear.
- An action in progress: `Spinner` inside the button, which stays disabled in place.

## 5. Lists

- Desktop: one surface (`ListSurface`): the `FacetToolbar` in the head of the card, the `DataTable` below it with
  `cornice={false}`, full width, last band.
- Phone: `MobileRow` cards, not a narrow table (the toolbar reshapes itself).
- Filters apply immediately, stay visible when active, show the result count, and **live in the URL**
  (`?q=…&stato=…`) so a view can be shared and survives a refresh.
- A `KpiCard` above a list is a handle: clicking it filters the list.
- Row click opens the detail; the row is a link (`rowHref`), not a button.

## 6. Forms

- Label **above** the field (`PropertyField`); hint in `text-xs text-muted-foreground` below.
- `FormGrid` with two columns, one below `sm`. Half width: dates, numbers, selects, people, codes.
  Full width: title, long text, address. A half cell is never alone.
- Order by information: who → what → where → when → how much → notes.
- Boolean = `Interruttore`. Number = `NumberField`. Date = `DateTrigger`. Choice from a list = `Scelta`
  (searchable when the list can grow). Free text = `Input` / `Textarea`.
- Buttons only in the footer: «Annulla» on the left, the verb on the right (`DialogoAzione` does this).
- Errors under the field in `text-destructive`, validated on blur. Never a toast for a field error.
- Only the title is required when creating something: every other field has a default or is optional.

## 7. Overlays: three levels

- **Dropdown** (`MenuAzioni`) = contextual shortcuts on a row or a header.
- **Dialog** (`DialogoAzione`) = one decision or one gesture. Width follows the nature:
  `conferma` · `gesto` · `creazione` · `documento`. More than two steps → `DialogoPassi`.
- **Page** = a job: many groups of fields, attachments, partial saves.
- The detail of a row is a page; `PannelloLaterale` when it must be read next to the list.
- Never a dialog inside a dialog. On phones everything opens from the bottom: the components handle it.

## 8. Feedback

| Event | Pattern |
|---|---|
| outcome of an action (saved, deleted) | toast, 4 s |
| reversible gesture (archive, remove) | `toastConAnnulla` with «Annulla», no confirmation |
| gesture with impact (someone loses access, many rows, cannot be undone) | `ConfirmDialog` |
| field error | text under the field |
| blocking error of a view | `Avviso tono='destructive'` at the top, with a way out |

## 9. Copy

UI copy is Italian; code and docs are English.

- Labels are property names («Scadenza», «Assegnata a»), not sentences.
- Every button says the verb («Crea task», «Salva», «Elimina»). Never «OK», «Clicca qui», «Invia».
- No sentence under a title. Tooltips: one impersonal sentence.
- The interface states a state («Salvato», «Nessuna task»), it does not narrate («Abbiamo salvato la tua task!»).

## 10. Navigation

| Level | Tool |
|---|---|
| between modules | sidebar, one active item |
| between areas of a module | `Tabs` underline, state in `?tab=` |
| between views of the same list | `ToggleGroup` pills, state in `?vista=` |

## 11. Phones

Nothing overflows: check at 390 px. Grids collapse 4 → 2 → 1. Remove what explains, keep what operates.
Touch targets come from the tokens; do not shrink controls by hand.

## 12. Keyboard and accessibility

`Esc` closes the top overlay, `Enter` confirms the active dialog, the focus ring is always visible
(never `outline-none` without a replacement), every icon button has a label, contrast is guaranteed by the tokens.

## 13. Data

Server Components read; Server Actions write. An action validates with zod, calls `requireAccess`, writes
through the user's own Supabase client (RLS is the last line of defence), calls `revalidatePath` and returns
`{ ok: true }` or `{ ok: false, message }`. See [DATABASE.md](DATABASE.md). Every module with actions is also
linked to the assistant with read tools and proposals: [AI.md](AI.md).

## Done means

1. Shell → PageHeader → bands, nothing hand-rolled.
2. One primary at most, last on the right.
3. Only semantic tokens; no hex, no raw palette, no `dark:`.
4. Full, empty and loading states exist.
5. Filters and views are in the URL.
6. Every button says its verb; labels are property names.
7. It works at 1440 and at 390.
8. `pnpm check` passes.
