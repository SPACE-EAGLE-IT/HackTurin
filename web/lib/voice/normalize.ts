import { CATEGORIES, type CategorySlug } from '@/lib/civic/categories'

// Words a caller (or the voice agent) may use, mapped to a category slug. Checked as substrings, in order.
const SYNONYMS: [CategorySlug, string[]][] = [
  [
    'cassonetto_pieno',
    ['cassonett', 'bidone', 'campana', 'contenitore', 'pattumiera piena', 'raccolta differenziata'],
  ],
  [
    'rifiuti_abbandonati',
    [
      'rifiut',
      'spazzatura',
      'immondizia',
      'sacchett',
      'discarica',
      'ingombrant',
      'sporcizia',
      'pattume',
      'abbandon',
    ],
  ],
  [
    'buca',
    ['buca', 'buche', 'voragine', 'asfalto', 'tombino', 'marciapiede rotto', 'dissesto', 'avvallamento'],
  ],
  ['graffiti', ['graffit', 'scritt', 'vandal', 'imbratt', 'tag', 'murales', 'danneggiat']],
  [
    'illuminazione',
    ['lampion', 'luce', 'luci', 'illuminazion', 'buio', 'lampada', 'palo della luce', 'semaforo'],
  ],
]

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_-]+/g, ' ').trim()

/** A category slug from whatever the agent sent: an exact slug, a name, or a spoken synonym; 'altro' otherwise. */
export function normalizeCategory(input: string): CategorySlug {
  const s = fold(input)
  const exact = CATEGORIES.find(c => fold(c.slug) === s || fold(c.name) === s)
  if (exact) return exact.slug
  for (const [slug, words] of SYNONYMS) if (words.some(w => s.includes(w))) return slug
  return 'altro'
}

/** A spoken address made fit for a geocoder: no fillers, «numero/civico 12» → «12», single spaces. */
export function normalizeAddress(input: string): string {
  return input
    .replace(/[«»"“”]/g, ' ')
    .replace(
      /^\s*(?:(?:si trova|e|è|sono|siamo|sto)\s+)?(?:in|a|al|alla|allo|nel|nella|presso|davanti a(?:l|lla|llo)?|vicino a(?:l|lla|llo)?)\s+/i,
      ''
    )
    .replace(/\b(?:numero|numero civico|civico|n\.?|nr\.?)\s*(\d+)/gi, '$1')
    .replace(/\s*,\s*torino\s*$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;]+|[\s,.;]+$/g, '')
}
