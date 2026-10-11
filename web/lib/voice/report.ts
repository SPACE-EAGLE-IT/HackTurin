import { createHash, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'

import { categoryName, type CategorySlug } from '@/lib/civic/categories'
import type { Place } from '@/lib/civic/geocode'

import { normalizeAddress, normalizeCategory } from './normalize'

/** Constant-time comparison of the tool secret (hashing first makes lengths equal). */
export function secretMatches(given: string | null, expected: string): boolean {
  if (!given) return false
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(expected).digest()
  return timingSafeEqual(a, b)
}

export const voiceReportSchema = z.object({
  category: z.string().trim().min(1).max(60),
  address: z.string().trim().min(2).max(200),
  description: z.string().trim().min(1).max(500),
  caller_consent: z.boolean().optional(),
})
export type VoiceReportInput = z.infer<typeof voiceReportSchema>

export type VoiceReportDeps = {
  geocode: (query: string) => Promise<Place | null>
  submit: (r: {
    category: CategorySlug
    lat: number
    lon: number
    description: string
  }) => Promise<{ id: string; deduped: boolean } | null>
}

export type VoiceReportResult =
  | {
      ok: true
      report_id: string
      deduped: boolean
      address_found: string
      category: CategorySlug
      message: string
    }
  | { ok: false; reason: 'address_not_found' | 'save_failed'; message: string }

/** The voice tool's work: map the category, geocode the spoken place, save the report, answer in Italian. */
export async function handleVoiceReport(
  input: VoiceReportInput,
  deps: VoiceReportDeps
): Promise<VoiceReportResult> {
  const category = normalizeCategory(input.category)
  const address = normalizeAddress(input.address)
  const place = address ? await deps.geocode(address) : null
  if (!place) {
    return {
      ok: false,
      reason: 'address_not_found',
      message:
        'Non ho trovato questo indirizzo a Torino. Puoi ripetere la via con il numero civico, oppure un incrocio o un luogo noto lì vicino?',
    }
  }
  const saved = await deps.submit({
    category,
    lat: place.lat,
    lon: place.lon,
    description: `[Telefono] ${input.description}`.slice(0, 500),
  })
  if (!saved) {
    return {
      ok: false,
      reason: 'save_failed',
      message: 'Non sono riuscito a registrare la segnalazione. Riprova tra poco oppure usa il sito.',
    }
  }
  const where = place.label || address
  const capPart = place.cap && place.cap !== 'N/D' && !where.includes(place.cap) ? `, CAP ${place.cap}` : ''
  const message = saved.deduped
    ? `Grazie: c'era già una segnalazione di ${categoryName(category).toLowerCase()} in ${where}${capPart}, ho aggiunto la tua.`
    : `Segnalazione di ${categoryName(category).toLowerCase()} registrata in ${where}${capPart}.`
  return { ok: true, report_id: saved.id, deduped: saved.deduped, address_found: where, category, message }
}
