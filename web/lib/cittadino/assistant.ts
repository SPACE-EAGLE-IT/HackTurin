import { tool } from 'ai'
import { z } from 'zod'

import { haversine } from '@/lib/civic/geo'
import { CATEGORIES, categoryName, REPORT_STATUS, TORINO_BOUNDS as B } from '@/lib/civic/categories'
import { geocodeTorino } from '@/lib/civic/geocode'
import { WEATHER } from '@/lib/civic/metrics'
import type { AiConfig } from '@/lib/ai/types'
import { environment } from '@/lib/public/environment'
import { publicFund, publicReports } from '@/lib/public/queries'

const SLUGS = CATEGORIES.map(c => c.slug) as [string, ...string[]]

/**
 * The citizen assistant runs on Claude with the server's key: ANTHROPIC_API_KEY, or AI_API_KEY when the
 * staff assistant is configured for Anthropic through the environment. `null` when no key is set.
 */
export function citizenAiConfig(): Pick<AiConfig, 'provider' | 'model' | 'baseUrl' | 'apiKey'> | null {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    (process.env.AI_PROVIDER === 'anthropic' ? process.env.AI_API_KEY : undefined)
  if (!apiKey) return null
  return {
    provider: 'anthropic',
    model: process.env.CITIZEN_AI_MODEL || 'claude-haiku-5-5',
    baseUrl: null,
    apiKey,
  }
}

export function citizenPrompt(today: string) {
  return `Sei l'assistente di To.Be, "un nuovo modo di vivere Torino": il servizio del Comune di Torino per segnalare problemi urbani, seguire cosa succede nel proprio quartiere e partecipare. Oggi è ${today}.

Parli con cittadini, spesso dal telefono: rispondi in italiano semplice, frasi brevi, al massimo 4-5 righe. Dai del tu.

Cosa sai fare:
- Aiutare a fare una segnalazione. Categorie: ${CATEGORIES.map(c => `${c.slug} (${c.name})`).join(', ')}. Chiedi solo ciò che manca: cosa, dove (via e numero o un punto di riferimento), un dettaglio utile. Poi usa prepara_segnalazione: la persona vede una scheda e conferma lei l'invio. Non dire mai che la segnalazione è inviata: lo fa la persona premendo «Invia».
- Dire cosa è già segnalato vicino a un indirizzo (segnalazioni_vicine) e lo stato.
- Meteo e qualità dell'aria adesso (ambiente_ora).
- Spiegare come partecipare: volontari [/volontari], aziende [/aziende], donazioni [/dona], statistiche [/statistiche], mappa [/].

Regole:
- Usa solo i dati degli strumenti; se non sai, dillo.
- Non chiedere dati personali (nome, telefono, email): non servono.
- Pericolo immediato (incendio, incidente, persona in difficoltà, fuga di gas): di' subito di chiamare il 112.
- Non dare consigli medici o legali. Niente argomenti estranei alla città: riporta gentilmente sul tema.
- Link solo relativi, in markdown, come quelli sopra.`
}

const place = z.object({
  indirizzo: z.string().min(2).max(160).describe('Via e civico o punto di riferimento a Torino'),
})

/** Read-only tools; the one that "creates" a report only prepares a draft the citizen confirms. */
export function citizenTools() {
  return {
    cerca_indirizzo: tool({
      description: 'Trova un indirizzo o un luogo di Torino: coordinate, indirizzo e CAP.',
      inputSchema: place,
      execute: async ({ indirizzo }) => {
        const p = await geocodeTorino(indirizzo)
        return p ? { trovato: true as const, ...p } : { trovato: false as const }
      },
    }),
    segnalazioni_vicine: tool({
      description: 'Segnalazioni già presenti entro 300 m da un indirizzo, con stato e categoria.',
      inputSchema: place,
      execute: async ({ indirizzo }) => {
        const p = await geocodeTorino(indirizzo)
        if (!p) return { trovato: false as const }
        const near = (await publicReports(true))
          .map(r => ({ ...r, m: Math.round(haversine([p.lon, p.lat], [r.lon, r.lat])) }))
          .filter(r => r.m <= 300)
          .sort((a, b) => a.m - b.m)
        return {
          trovato: true as const,
          indirizzo: p.label,
          aperte: near.filter(r => r.status === 'open' || r.status === 'in_progress').length,
          risolte: near.filter(r => r.status === 'resolved').length,
          elenco: near.slice(0, 8).map(r => ({
            categoria: categoryName(r.category),
            stato: REPORT_STATUS[r.status as keyof typeof REPORT_STATUS] ?? r.status,
            distanza_m: r.m,
            segnalata_volte: r.observations,
            dal: r.created_at.slice(0, 10),
          })),
        }
      },
    }),
    ambiente_ora: tool({
      description: 'Meteo e qualità dell’aria a Torino in questo momento.',
      inputSchema: z.object({}),
      execute: async () => {
        const { city } = await environment()
        if (!city) return { disponibile: false as const }
        return {
          disponibile: true as const,
          cielo: city.weather_code != null ? (WEATHER[city.weather_code] ?? null) : null,
          temperatura_c: city.temperature_c ?? null,
          vento_kmh: city.wind_kmh ?? null,
          indice_aria_europeo: city.european_aqi ?? null,
          pm25_ugm3: city.pm25_ugm3 ?? null,
          no2_ugm3: city.no2_ugm3 ?? null,
        }
      },
    }),
    numeri_partecipazione: tool({
      description: 'Quanto hanno fatto volontari e donatori finora (fondo, missioni, ore).',
      inputSchema: z.object({}),
      execute: async () => publicFund(),
    }),
    prepara_segnalazione: tool({
      description:
        'Prepara una segnalazione da far confermare alla persona: compare una scheda con il tasto «Invia». Usalo quando sai cosa e dove.',
      inputSchema: z.object({
        categoria: z.enum(SLUGS),
        indirizzo: z.string().min(2).max(160),
        descrizione: z.string().max(500).describe('Breve, con i dettagli detti dalla persona'),
      }),
      execute: async ({ categoria, indirizzo, descrizione }) => {
        const p = await geocodeTorino(indirizzo)
        if (!p)
          return {
            pronta: false as const,
            motivo: 'Indirizzo non trovato a Torino: chiedi un riferimento più preciso.',
          }
        const inside = p.lat >= B.minLat && p.lat <= B.maxLat && p.lon >= B.minLon && p.lon <= B.maxLon
        if (!inside) return { pronta: false as const, motivo: 'Il luogo è fuori da Torino.' }
        return {
          pronta: true as const,
          categoria,
          categoria_nome: categoryName(categoria),
          indirizzo: p.label,
          cap: p.cap,
          lat: p.lat,
          lon: p.lon,
          descrizione,
        }
      },
    }),
  }
}

export type ReportDraft = {
  pronta: true
  categoria: string
  categoria_nome: string
  indirizzo: string
  cap: string
  lat: number
  lon: number
  descrizione: string
}
