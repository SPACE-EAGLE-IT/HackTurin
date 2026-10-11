import type { StatusTone } from '@/components/ds/status-badge'

export const REPORT_STATUSES = ['open', 'in_progress', 'resolved', 'rejected'] as const
export type ReportStatus = (typeof REPORT_STATUSES)[number]
export const REPORT_SOURCES = ['citizen', 'device'] as const
export type ReportSource = (typeof REPORT_SOURCES)[number]

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  open: 'Aperta',
  in_progress: 'In lavorazione',
  resolved: 'Risolta',
  rejected: 'Respinta',
}

export const REPORT_STATUS_TONE: Record<ReportStatus, StatusTone> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  rejected: 'muted',
}

export const REPORT_SOURCE_LABEL: Record<ReportSource, string> = { citizen: 'Cittadino', device: 'POD' }

export type ReportFilters = {
  q?: string
  status?: ReportStatus[]
  category?: string[]
  source?: ReportSource[]
  cap?: string[]
}

/** A report as lists, maps and the assistant need it. */
export type ReportListItem = {
  id: string
  category: string
  status: ReportStatus
  source: ReportSource
  description: string | null
  photo_url: string | null
  confidence: number
  severity: number
  observations: number
  created_at: string
  resolved_at: string | null
  lat: number
  lon: number
  cap: string
  device_name: string | null
}

export type ReportDetail = ReportListItem & {
  metadata: unknown
  interventions: { id: string; title: string; status: string; assignee: string | null }[]
  missions: { id: string; title: string; status: string; volunteer: string | null }[]
}

export type ReportKpis = { open: number; inProgress: number; resolved30: number; fromPods: number }

/** Priority used to sort the work queue: severity × confidence × repeated sightings. */
export const priorityOf = (r: Pick<ReportListItem, 'severity' | 'confidence' | 'observations'>) =>
  r.severity * r.confidence * (1 + Math.log(Math.max(1, r.observations)))
