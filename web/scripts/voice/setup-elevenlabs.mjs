#!/usr/bin/env node
/**
 * Creates (or updates) the To.Be voice agent on ElevenLabs Agents and its two webhook tools.
 *
 *   node --env-file=.env.local scripts/voice/setup-elevenlabs.mjs
 *
 * Env: ELEVENLABS_API_KEY, VOICE_TOOL_SECRET, NEXT_PUBLIC_SITE_URL (public https origin; ElevenLabs cannot reach
 * localhost). Optional: ELEVENLABS_AGENT_ID (update that agent instead of creating one), ELEVENLABS_VOICE_ID,
 * ELEVENLABS_LLM. Idempotent: tools are matched by name and updated in place.
 * Docs: https://elevenlabs.io/docs/api-reference/agents/create · /tools/create
 */

const API = process.env.ELEVENLABS_API_BASE ?? 'https://api.elevenlabs.io'
const KEY = process.env.ELEVENLABS_API_KEY
const SECRET = process.env.VOICE_TOOL_SECRET
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? '').replace(/\/+$/, '')
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID
// Claude inside ElevenLabs: Sonnet is the best quality/latency trade-off for a live phone call.
const LLM = process.env.ELEVENLABS_LLM ?? 'claude-sonnet-5-5'
// A multilingual voice; with language 'it' it speaks Italian. Override with an Italian voice from the library.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'cjVigY5qzO86Huf0OWal'

function fail(msg) {
  console.error(`✗ ${msg}`)
  process.exit(1)
}
if (!KEY) fail('ELEVENLABS_API_KEY mancante')
if (!SECRET || SECRET.length < 24) fail('VOICE_TOOL_SECRET mancante o troppo corto (almeno 24 caratteri)')
if (!/^https:\/\//.test(SITE) || /localhost|127\.0\.0\.1/.test(SITE)) {
  fail(
    'NEXT_PUBLIC_SITE_URL deve essere l’URL https pubblico del sito (es. https://torinosegnala.vercel.app)'
  )
}

async function api(method, path, body) {
  const r = await fetch(`${API}${path}`, {
    method,
    headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await r.text()
  if (!r.ok) fail(`${method} ${path} → ${r.status}: ${text.slice(0, 800)}`)
  return text ? JSON.parse(text) : {}
}

const CATEGORY_SLUGS = [
  'rifiuti_abbandonati',
  'cassonetto_pieno',
  'buca',
  'graffiti',
  'illuminazione',
  'altro',
]
const headers = { 'x-voice-secret': SECRET }

const TOOLS = [
  {
    type: 'webhook',
    name: 'registra_segnalazione',
    description:
      'Registra una segnalazione di un problema urbano a Torino. Chiamalo solo dopo che il cittadino ha confermato categoria, luogo e descrizione. Leggi ad alta voce il campo "message" della risposta.',
    response_timeout_secs: 20,
    api_schema: {
      url: `${SITE}/api/voice/report`,
      method: 'POST',
      request_headers: headers,
      request_body_schema: {
        type: 'object',
        description: 'La segnalazione raccolta durante la chiamata',
        properties: {
          category: {
            type: 'string',
            description: 'Categoria del problema',
            enum: CATEGORY_SLUGS,
          },
          address: {
            type: 'string',
            description:
              'Luogo esatto a Torino come detto dal cittadino: via e numero civico, oppure incrocio o luogo noto (es. "via Roma 12", "corso Francia angolo via Cibrario")',
          },
          description: {
            type: 'string',
            description:
              'Breve descrizione del problema in italiano, massimo due frasi, senza dati personali',
          },
          caller_consent: {
            type: 'boolean',
            description: 'true se il cittadino ha confermato il riepilogo e vuole inviare la segnalazione',
          },
        },
        required: ['category', 'address', 'description'],
      },
    },
  },
  {
    type: 'webhook',
    name: 'situazione_zona',
    description:
      'Dice quante segnalazioni aperte ci sono vicino a un indirizzo di Torino. Usalo quando il cittadino chiede com’è la situazione in una via o zona. Leggi il campo "message".',
    response_timeout_secs: 20,
    api_schema: {
      url: `${SITE}/api/voice/zone`,
      method: 'POST',
      request_headers: headers,
      request_body_schema: {
        type: 'object',
        description: 'La zona richiesta',
        properties: {
          address: { type: 'string', description: 'Via, piazza o luogo noto di Torino' },
        },
        required: ['address'],
      },
    },
  },
]

const FIRST_MESSAGE =
  'Ciao, sei al numero verde di To.Be, il servizio del Comune di Torino per segnalare problemi in città. Cosa vuoi segnalare?'

const PROMPT = `Sei l'assistente vocale del numero verde di To.Be, il servizio del Comune di Torino per segnalare problemi urbani. Parli sempre in italiano, con frasi brevi e un tono cordiale.

Obiettivo: raccogliere una segnalazione e registrarla con lo strumento registra_segnalazione.
1. Capisci il tipo di problema e scegli una categoria: rifiuti_abbandonati, cassonetto_pieno, buca (buche e dissesti stradali), graffiti (anche vandalismo), illuminazione (lampioni guasti), altro.
2. Chiedi il luogo esatto a Torino: via e numero civico, oppure un incrocio o un luogo noto. Se è vago, chiedi un riferimento più preciso.
3. Raccogli una breve descrizione (una o due frasi).
4. Ripeti un riepilogo (problema, luogo, descrizione) e chiedi conferma.
5. Solo dopo la conferma chiama registra_segnalazione e leggi al cittadino il campo "message" della risposta. Se la risposta dice che l'indirizzo non è stato trovato, chiedi di ripeterlo e riprova.
6. Ringrazia e chiudi la chiamata.

Se il cittadino chiede com'è la situazione in una via o zona, usa situazione_zona e leggi il campo "message".

Regole:
- Non chiedere mai nome, cognome, numero di telefono, email o altri dati personali; se il cittadino li dice, non riportarli nella descrizione.
- Per emergenze o pericoli immediati (incendi, incidenti, persone in pericolo, fughe di gas) di' subito di chiamare il 112 e non registrare la segnalazione.
- Non inventare tempi di intervento né promesse: il Comune prende in carico la segnalazione.
- Resta sul tema delle segnalazioni urbane; per altro indica il sito del Comune di Torino.`

async function upsertTools() {
  const existing = await api('GET', '/v1/convai/tools')
  const list = existing.tools ?? []
  const ids = []
  for (const tool of TOOLS) {
    const found = list.find(t => t.tool_config?.name === tool.name)
    if (found) {
      await api('PATCH', `/v1/convai/tools/${found.id}`, { tool_config: tool })
      console.log(`↻ strumento ${tool.name} aggiornato (${found.id})`)
      ids.push(found.id)
    } else {
      const created = await api('POST', '/v1/convai/tools', { tool_config: tool })
      console.log(`+ strumento ${tool.name} creato (${created.id})`)
      ids.push(created.id)
    }
  }
  return ids
}

const toolIds = await upsertTools()

const agent = {
  name: 'To.Be — numero verde segnalazioni',
  tags: ['tobe', 'torino'],
  conversation_config: {
    agent: {
      first_message: FIRST_MESSAGE,
      language: 'it',
      prompt: { prompt: PROMPT, llm: LLM, temperature: 0.3, tool_ids: toolIds },
    },
    // Flash v2.5 is multilingual and the lowest-latency model for a phone call.
    tts: { voice_id: VOICE_ID, model_id: 'eleven_flash_v2_5' },
    conversation: { max_duration_seconds: 600 },
  },
  platform_settings: {
    // GDPR: no audio kept, transcripts deleted after 7 days (the report itself lives in our database).
    privacy: { record_voice: false, retention_days: 7, delete_audio: true },
  },
}

let agentId = AGENT_ID
if (agentId) {
  await api('PATCH', `/v1/convai/agents/${agentId}`, agent)
  console.log(`↻ agente aggiornato: ${agentId}`)
} else {
  const created = await api('POST', '/v1/convai/agents/create', agent)
  agentId = created.agent_id
  console.log(`+ agente creato: ${agentId}`)
}

console.log(`
Fatto. LLM: ${LLM} · voce: ${VOICE_ID} · webhook: ${SITE}/api/voice/report

Aggiungi a .env.local (e alle variabili d'ambiente di Vercel):
  ELEVENLABS_AGENT_ID=${agentId}
  NEXT_PUBLIC_ELEVENLABS_AGENT_ID=${agentId}
Poi riavvia il server: su /segnala comparirà «Parla con l’assistente».`)
