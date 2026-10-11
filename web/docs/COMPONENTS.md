# Components — which piece for which job

The design system ships as source in `components/ui` (primitives, shadcn-based) and `components/ds` (frames and
composites). **Do not read those sources to learn the API: this sheet is the API.** Component and prop names are
Italian (they are shared with the upstream product); the notes are English. Only props an application needs are
listed. `cn` from `@/lib/utils` merges classes.

Import paths: `@/components/ds/<file>` and `@/components/ui/<file>`. `AppShell`, `PageHeader` and `DataToolbar`
are default exports; everything else is named.

**Server and client.** Most frames are Client Components (`EmptyState`, `KpiCard`, `SectionCard`, `MobileRow`,
`PannelloScheda`, …). A Server Component may render them, but it cannot pass them a **function**, and an icon
component is a function: `<EmptyState icon={LockIcon} />` from a `page.tsx` fails at runtime. Either render that
markup inside a small Client Component, or omit the icon. `pnpm check` flags it (`ICON_FROM_SERVER`).

## Frame of a screen

| Job | Component | Props that matter |
|---|---|---|
| The page frame | `AppShell` (default, `ds/app-shell`) | provided by `app/(app)/layout.tsx`; a view never mounts it |
| Page title | `PageHeader` (default, `ds/page-header`) | `title`, `description?`, `actions?` (buttons; primary last), `badges?` (status next to the title), `meta?` (facts below) |
| Back to the list | `BackLink` (`ds/back-link`) | `href`, children = label |
| A titled box | `SectionCard` (`ds/section-card`) | `title?`, `info?` (help text), `action?` (node at the right of the title), `appiattita?` (no border, inside another card), `children` |
| A collapsible group | `GroupSection` (`ds/group-section`) | `title`, `count?`, `icon?`, `defaultOpen?`, `actions?` |
| A detail panel with rows | `PannelloScheda` + `RigaDettaglio` (`ds/pannello-scheda`) | `occhiello` (group label), `ripiegabile?`; `RigaDettaglio`: `label`, children = value |
| A tinted notice | `Avviso` (`ds/avviso`) | `tono: 'info' \| 'warning' \| 'destructive' \| 'success'`, children |

```tsx
<PageHeader
  title='Task'
  description='Tutto il lavoro aperto, per stato.'
  actions={<Button onClick={() => setOpen(true)}><PlusIcon /> Nuova task</Button>}
/>
```

**Detail layout.** A detail page is a two-column grid whose tracks must be allowed to shrink, or a long value
(a project name in a `Scelta`, a comment, a title) pushes the page wider than the screen:
`grid grid-cols-[minmax(0,1fr)] gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]` — never a fixed `20rem` track
and never the implicit `auto` column on phones.

## Numbers and charts

| Job | Component | Props that matter |
|---|---|---|
| A KPI tile | `KpiCard` (`ds/kpi-card`) | `title`, `value?` (number, animated) or `display?` (string), `suffix?`, `hint?`, `tone?: 'default' \| 'destructive' \| 'warning' \| 'success' \| 'info'`, `icon?`, `onClick?` + `active?` when the tile filters the list |
| The KPI band | `KpiGrid` / `KpiGridSkeleton` | `count?: 3 \| 4 \| 5` |
| A value against a target | `MeterRow` (`ds/meter-row`) | `label`, `value?` (text on the right), `pct` (0–100), `fillClassName?` (e.g. `bg-success`), `onClick?` |
| A ring | `Anello` (`ds/grafico-anello`) | `valore` (0–100), `testo?`, `etichetta?` |
| A chart box | `ChartCard`, `ChartTip`, `NoData`, `CHART_GRID`, `CHART_AXIS_TICK` (`ds/chart-frame`) | wrap a recharts chart; use `SERIE`/`TINTE` from `@/lib/grafici-geometria` as colours |
| Parts of a whole | `BarraParti` (`ds/grafico-barra-parti`) | `parti: { nome, valore }[]`, `formato?` |
| A ranking | `Classifica` (`ds/grafico-classifica`) | `voci: { nome, valore }[]`, `conQuota?` |

```tsx
<KpiGrid count={4}>
  <KpiCard title='Aperte' value={aperte} onClick={() => setStato('open')} active={stato === 'open'} />
  <KpiCard title='In ritardo' value={inRitardo} tone='destructive' />
</KpiGrid>
```

## Lists

| Job | Component | Props that matter |
|---|---|---|
| The list's single surface | `ListSurface` (`components/list-surface`) | `toolbar` (a `FacetToolbar`), `title?`, `above?`, children = the table with `cornice={false}`; one card for filters, count and rows, stacked on phones |
| Table (desktop) | `DataTable` (`ds/data-table`) | `data`, `columns: ColumnDef<T>[]` (tanstack), `rowHref?: (row) => string`, `rowLabel?`, `footer` (node or `({ rese, totali }) => node`), `densita?: 'normale' \| 'media' \| 'fitta'`, `ordinamento?`, `cornice?` (false inside a card) |
| Table loading | `DataTableSkeleton` | `rows?` |
| Rows on phones | `MobileRowList` + `MobileRow` + `MobileRowSkeleton` (`ds/mobile-row`) | `MobileRow`: `title`, `meta?: ReactNode[]`, `leading?` (avatar/icon), `signal?` (badge), `href?`, `footer?`, `index` |
| Toolbar with filters | `FacetToolbar` (`ds/facet-toolbar`) | `search?: { placeholder, value, onChange }`, `facets: FacetSpec[]`, `activeCount`, `onClearAll`, `resultCount?`, `actions?`, `extraFilters?` (rows of `FilterRow`), `sort?` |
| A filter | `FacetSpec` (`ds/mega-filter`) | `{ key, label, icon, options: { value, label, count?, icon? }[], selected: string[], onToggle(value), single?, search?: { placeholder } }`; dates: `facetData({ key, label, icon, valore, onChange })`; numbers: `facetNumero(...)` |
| A row in the filter panel | `FilterRow` | `label`, children = control (e.g. `Interruttore`) |
| Sorting outside the panel | `SortMenu` (`ds/sort-menu`) | `value`, `options`, `onChange` |
| Actions on many rows | `BulkActionBar` (`ds/bulk-action-bar`) | `count`, `noun`, `onClear`, children = buttons |
| Empty list | `EmptyState` (`ds/empty-state`) | `icon?`, `title?`, `description?`, `action?` (outline button or nothing); `compatto` + `testo` for an inline one-liner |
| Truncated text with full text on hover | `Troncato` (`ds/troncato`) | children, `righe?` |

Filters and views live in the URL (`useSearchParams` + `router.replace`), never in a global store.

```tsx
const facets: FacetSpec[] = [
  { key: 'stato', label: 'Stato', icon: CircleDotIcon, options: STATI, selected: stati, onToggle: toggleStato },
]
<FacetToolbar search={{ placeholder: 'Cerca task', value: q, onChange: setQ }} facets={facets}
  activeCount={stati.length} onClearAll={reset} resultCount={rows.length} />
<DataTable data={rows} columns={columns} rowHref={r => `/tasks/${r.id}`} footer={({ rese, totali }) => `${rese} di ${totali}`} />
```

## Board (kanban)

From `ds/board-frame`, built on `@dnd-kit/core`: `useBoardSensors()`, `useBoardCollision()`,
`useBoardColumns(source, build)` → `{ columns, setColumns, draggingRef, resync }`, `BoardScroller` (the horizontal
viewport, `dragging`), `BoardColumnShell` (`title`, `count`, `isOver?`, `innerRef?` from `useDroppable`, children),
`BoardEmptyDrop`, `BoardDragPreview` (inside `DragOverlay`), `TestaCardBoard` (`titolo`, `glifi?`, `menu?`).
Cards are your own `Card`s wrapped by `useDraggable`. `BoardSkeleton` is in `ds/skeletons`.

## Status and identity

| Job | Component | Props that matter |
|---|---|---|
| A status | `StatusBadge` (`ds/status-badge`) | `tone: 'success' \| 'warning' \| 'info' \| 'destructive' \| 'muted'`, `icon?`, `dot?`, `variant?: 'piatta' \| 'bordata' \| 'badge'`, children = label |
| A person or an entity | `RiferimentoEntita` (`ds/riferimento-entita`) | `nome`, `tipo: 'utente' \| 'persona' \| 'azienda' \| 'progetto' \| …`, `href?`, `immagine?`, `iniziali?`, `size?: 'xs' \| 'sm' \| 'md'`, `secondario?`, `muto?` (not a link) |
| A tag | `TagChip` (`ds/tag-chip`) | `tag`, `onRemove?` |
| A date | `Data` (`ds/data`) | `valore` (ISO or Date), `forma?: 'intera' \| 'corta' \| 'giornoMese' \| 'eta' \| 'compatta'` |
| A read-only value | `ValoreLetto` (`ds/valore-letto`) | `valore`, `variant?: 'nudo' \| 'campo'` |
| Copy to clipboard | `CopiaValore` (`ds/copia-valore`) | `testo`, `etichetta` |
| An explanation | `InfoDot` (`ds/info-dot`) | `label` (accessible name), children = text |

## Forms and fields

| Job | Component | Props that matter |
|---|---|---|
| Field grid | `FormGrid`, `FormGridFull` (`ds/form-grid`) | `cols?: 1 \| 2` (two by default, one below `sm`) |
| Label above a field | `PropertyField` (`ds/field-trigger`) | `label`, `span?` (full row), children = control |
| Named group of fields | `FormGruppo` (`ds/form-gruppo`) | `cornice: 'dialog' \| 'pagina'`, `title` |
| Text | `Input`, `Textarea` (`ui/…`) | standard |
| Choice from a list | `Scelta` (`ds/scelta`) | `opzioni: { value, label }[]`, `value`, `onValueChange`, `placeholder?`, `azzera?` (label of the "none" option), `cerca?` (search placeholder; search appears above 7 options), `crea?: { etichetta, onScegli }`; `multipla` + `value: string[]` for many |
| Date | `DateTrigger` (`ds/field-trigger`) | `value?` (`YYYY-MM-DD`), `onChange(dateKey?)`, `placeholder`, `min?` |
| Number | `NumberField` (`ds/number-field`) | `value: number \| null`, `onValueChange`, `decimals?`, `unit?`, `placeholder?` |
| Boolean | `Interruttore` (`ds/interruttore`) | `etichetta`, `acceso`, `onAcceso`, `descrizione?`, `info?` |
| Checklist | `ElencoDaSpuntare` (`ds/elenco-da-spuntare`) | `voci`, `scelte`, `onAlterna`, `vuoto` |
| Title edited in place | `TitoloModificabile` (`ds/titolo-modificabile`) | `valore`, `salva: (testo) => Promise<{ ok, motivo? }>`, `etichetta` |
| Many checkboxes with select-all | `CasellaFascia` (`ds/casella-fascia`) | `stato`, `etichetta`, `onSeleziona` |

```tsx
<FormGrid>
  <PropertyField label='Titolo' span><Input name='title' required autoFocus /></PropertyField>
  <PropertyField label='Commessa'><Scelta opzioni={progetti} value={projectId} onValueChange={setProjectId} azzera='Nessuna' cerca='Cerca commessa' /></PropertyField>
  <PropertyField label='Scadenza'><DateTrigger value={dueDate} onChange={setDueDate} placeholder='Scegli una data' /></PropertyField>
</FormGrid>
```

## Dialogs, menus and actions

| Job | Component | Props that matter |
|---|---|---|
| A dialog with a footer | `DialogoAzione` (`ds/dialogo-azione`) | `open`, `onOpenChange`, `titolo`, `descrizione?`, `natura: 'conferma' \| 'gesto' \| 'creazione' \| 'documento'` (sets the width), `azione: { etichetta, onClick?, type?: 'submit', form?, attesa?, disabled?, distruttiva? }`, `annulla?: { etichetta? } \| false`, children = body |
| A dialog in steps | `DialogoPassi` (`ds/dialogo-passi`) | `passi: { chiave, etichetta }[]`, `corrente`, `avanti`, `indietro`, `finale` |
| Confirmation | `ConfirmDialog` (`ds/confirm-dialog`) | `open`, `title`, `description`, `confirmLabel`, `onConfirm`, `onClose`, `tone?: 'destructive'`, `motivo?` (asks a reason) |
| Row / header menu | `MenuAzioni` (`ds/menu-azioni`) | `etichetta` (accessible name), children = `DropdownMenuItem`s from `ui/dropdown-menu` |
| Icon-only button | `BottoneIcona` (`ds/bottone-icona`) | `etichetta` (becomes aria-label and tooltip), `icona`, `variant?`, `size?: 'icon' \| 'icon-xs' \| 'icon-sm'` |
| Primary with alternatives | `BottoneDiviso` (`ds/bottone-diviso`) | `etichetta`, `onClick`, `altre: { chiave, etichetta, onSelect }[]` |
| Side panel next to a list | `PannelloLaterale` (`ds/pannello-laterale`) | `titolo`, `visibile`, `aperto`, `sheetAperto`, `onChiudiSheet`, children |
| Toasts | `toast` from `sonner`; `toastConAnnulla` from `@/lib/toast-annulla` | `toast.success('Salvato')`; `toastConAnnulla({ messaggio, annulla: async () => … })` |
| Run an action and toast the outcome | `eseguiConEsito` (`@/lib/esegui-con-esito`) | `eseguiConEsito(action(), r => { if (r.ok) toast.success('…') else toast.error(r.message) })` |

```tsx
<DialogoAzione open={open} onOpenChange={setOpen} titolo='Nuova task' natura='creazione'
  azione={{ etichetta: 'Crea task', type: 'submit', form: 'new-task', attesa: pending }}>
  <form id='new-task' action={formAction}>…</form>
</DialogoAzione>
```

## Chat

| Job | Component | Props that matter |
|---|---|---|
| A chat message | `Bubble` (`ds/bolla-messaggio`) | `lato: 'richiedente' \| 'staff'` (right / left), `avatar`, `firma` (name under the bubble), `inInvio?` (pending), `tono?: 'messaggio' \| 'nota'`, children |
| The assistant | `AssistantDock` (the docked panel), `AssistantDisc`, `AssistantChat`, `ProposalCard` (`components/assistant/`) | see [AI.md](AI.md); a module only writes `lib/<module>/ai.ts` |

## Loading

`Skeleton` (`ui/skeleton`), `DataTableSkeleton`, `KpiGridSkeleton`, `MobileRowSkeleton`, `ListSkeleton` and
`BoardSkeleton` (`ds/skeletons`). A `Spinner` (`ui/spinner`) goes inside a button, never on a page.

## Also in the system

Pieces the frames above are built from, or that a specialised screen may need. Same import rule: read the
exported types of the file only when the sheet is not enough.

| Component | What it is |
|---|---|
| `Calendario` (`ds/calendario`) | calendar primitive with the Italian locale; `DateTrigger` and the date facet use it |
| `ChipInterruttore` (`ds/chip-interruttore`) | toggle chip, pressable or removable |
| `ColumnFunnel` (`ds/column-funnel`) | column-header filter that opens the same facet as the panel (`DataTable` `imbuti`) |
| `Combobox` (`ds/combobox-menu`) | searchable single choice, in a popover or inline; `Scelta` wraps it |
| `MultiCommand` (`ds/multi-command`) | searchable multi choice in a popover; `Scelta multipla` wraps it |
| `DataToolbar` (default, `ds/data-toolbar`) | the bare toolbar: search left, filters, actions right; `FacetToolbar` wraps it |
| `DataFacetPanel`, `facetData` (`ds/date-range-facet`) | the date facet with presets and from/to |
| `FilterRow`, `FacetSpec`, `facetNumero` (`ds/mega-filter`) | the one filter panel; rows and facet helpers |
| `FacetOptionRow`, `FiltroPremuto` (`ds/toolbar-bits`) | option rows and the pressed-filter button of toolbars |
| `ComandiDialog` (`ds/dialog-comandi`) | the «open as page» command in a dialog header (`DialogoAzione` `comandi`) |
| `Sentinella`, `useFinestra` (`ds/finestra`) | windowing for very long lists (`DataTable` `finestra`) |
| `Passi`, `PiedePassi` (`ds/passi`) | step indicator and step footer of multi-step flows (the setup wizard uses them) |
| `Legend`, `LegendRow` (`ds/legend`) | chart legend rows |
| `AreaSfumata`, `Riferimento`, `Rilievo` (`ds/grafico-*`) | gradient area, reference line and highlighted point for recharts |
| `usePannelloDestro`, `ContenitoreSoglie` (`ds/workspace`) | the hooks and frame behind `PannelloLaterale` |

## Primitives (`components/ui`)

`Button` (`variant: default | outline | ghost | destructive | secondary | link`, `size: sm | default | lg | icon`),
`Badge`, `Card`, `Input`, `Textarea`, `Label`, `Checkbox`, `Switch`, `Select`, `Tabs`, `ToggleGroup`, `Tooltip`,
`Popover`, `DropdownMenu`, `Dialog`, `Sheet`, `Command`, `Avatar`, `Separator`, `ScrollArea`, `Table`, `Kbd`,
`Alert`, `Progress`, `Slider`, `Collapsible`, `Sidebar`, `Sonner` (the `Toaster`). Standard shadcn APIs.

## Helpers (`lib/`)

`formatDateIt`, `formatDateItCorta`, `formatDataOraIt`, `formatEtaIt` (`format-date`) · `dateKey`, `todayKey`,
`addDays` (`date-keys`) · `numeroIt`, `percentoIt`, `quotaIt` (`format-number`) · `cn` (`utils`) ·
`stagger(index)` for staggered entrance styles · `useIsMobile()` (`hooks/use-mobile`).
