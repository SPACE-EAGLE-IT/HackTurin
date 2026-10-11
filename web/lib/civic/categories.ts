/** Report categories. `token` is the design-system colour (CSS variable) used on maps and dots. */
export const CATEGORIES = [
  { slug: 'rifiuti_abbandonati', name: 'Rifiuti abbandonati', token: '--chart-alert', dot: 'bg-chart-alert' },
  { slug: 'cassonetto_pieno', name: 'Cassonetto pieno', token: '--chart-ochre', dot: 'bg-chart-ochre' },
  { slug: 'buca', name: 'Buca stradale', token: '--chart-plum', dot: 'bg-chart-plum' },
  { slug: 'graffiti', name: 'Graffiti / vandalismo', token: '--chart-slate', dot: 'bg-chart-slate' },
  { slug: 'illuminazione', name: 'Illuminazione guasta', token: '--chart-good', dot: 'bg-chart-good' },
  { slug: 'altro', name: 'Altro', token: '--chart-context', dot: 'bg-chart-context' },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]['slug']
export const CATEGORY = Object.fromEntries(CATEGORIES.map(c => [c.slug, c])) as Record<
  string,
  (typeof CATEGORIES)[number]
>
export const categoryName = (slug: string) => CATEGORY[slug]?.name ?? slug

export const REPORT_STATUS = {
  open: 'Aperta',
  in_progress: 'In lavorazione',
  resolved: 'Risolta',
  rejected: 'Respinta',
} as const
export type ReportStatus = keyof typeof REPORT_STATUS

export const SOURCE_LABEL = { citizen: 'Cittadino', device: 'POD' } as const

/** [lon, lat] of Piazza Castello, the default map centre. */
export const TORINO_CENTER: [number, number] = [7.6869, 45.0703]

/** Turin bounding box accepted for reports. */
export const TORINO_BOUNDS = { minLat: 44.9, maxLat: 45.2, minLon: 7.45, maxLon: 7.9 } as const
