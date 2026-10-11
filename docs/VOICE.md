# Numero verde vocale — To.Be

Il cittadino chiama (o parla dal browser su `/segnala`), un assistente vocale in italiano raccoglie
**tipo di problema, luogo e descrizione**, ripete il riepilogo e registra la segnalazione sulla mappa,
come se fosse arrivata dal modulo web. Non serve registrarsi e non viene chiesto alcun dato personale.

## Come funziona

```
Cittadino ──telefono (Twilio/SIP)──┐
          ──widget web /segnala ───┴─► Agente ElevenLabs (STT → Claude → TTS, lingua 'it')
                                            │ strumento webhook "registra_segnalazione"
                                            │ POST + header x-voice-secret
                                            ▼
                         https://<sito>/api/voice/report
                           1. verifica il segreto (confronto a tempo costante)
                           2. normalizza categoria ("buche" → buca) e indirizzo ("numero 12" → 12)
                           3. geocodifica con OpenStreetMap Nominatim, solo dentro Torino
                           4. salva con la RPC anonima submit_citizen_report (descrizione "[Telefono] …")
                           5. risponde { ok, report_id, deduped, address_found, message }
                                            │
                                            ▼
                         l'agente legge "message": «Segnalazione … registrata in Via Roma 12, CAP 10121.»
```

- Se l'indirizzo non si trova, la risposta è `{ ok: false, reason: 'address_not_found', message }` e
  l'agente chiede di ripeterlo.
- Secondo strumento, `situazione_zona` → `POST /api/voice/zone` con `{ address }`: quante segnalazioni
  aperte ci sono entro 300 m («com'è la situazione in via X?»). Sola lettura.
- Per le emergenze l'agente invita a chiamare il **112** e non registra nulla.
- LLM: Claude (`claude-sonnet-5-5`) scelto dentro ElevenLabs; voce `eleven_flash_v2_5` (multilingue, bassa latenza).

Codice: `web/app/api/voice/*`, `web/lib/voice/*` (logica pura + test), `web/components/civic/voice-line.tsx`,
`web/scripts/voice/setup-elevenlabs.mjs`.

## Variabili d'ambiente

| Variabile | Dove | A cosa serve |
|---|---|---|
| `ELEVENLABS_API_KEY` | solo `.env.local` (script) | chiave API ElevenLabs, usata solo dallo script di setup |
| `VOICE_TOOL_SECRET` | `.env.local` **e** Vercel | segreto condiviso fra agente e webhook (≥ 24 caratteri casuali, es. `openssl rand -hex 32`). Senza, le route rispondono 503 |
| `ELEVENLABS_AGENT_ID` | `.env.local` | se presente, lo script aggiorna quell'agente invece di crearne uno nuovo |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` | `.env.local` e Vercel | id pubblico dell'agente: fa comparire il blocco «Preferisci parlare?» su `/segnala` |
| `NEXT_PUBLIC_VOICE_NUMBER` | `.env.local` e Vercel | numero da mostrare (link `tel:`); facoltativo |
| `NEXT_PUBLIC_SITE_URL` | `.env.local` | URL **https pubblico** del sito: il webhook deve essere raggiungibile da ElevenLabs (non `localhost`) |

Facoltative per lo script: `ELEVENLABS_VOICE_ID` (una voce italiana dalla Voice Library), `ELEVENLABS_LLM`.

## Setup

1. Pubblica il sito (es. Vercel) con `VOICE_TOOL_SECRET` impostato.
2. In `web/.env.local` metti `ELEVENLABS_API_KEY`, lo stesso `VOICE_TOOL_SECRET` e `NEXT_PUBLIC_SITE_URL=https://…`.
3. Da `web/`:
   ```bash
   node --env-file=.env.local scripts/voice/setup-elevenlabs.mjs
   ```
   Lo script crea/aggiorna i due strumenti webhook (con l'header segreto) e l'agente, poi stampa l'id.
4. Copia l'id in `ELEVENLABS_AGENT_ID` e `NEXT_PUBLIC_ELEVENLABS_AGENT_ID` (anche su Vercel) e rideploya.
   Rilanciare lo script è sicuro: aggiorna, non duplica.
5. Prova: apri `/segnala` → «Parla con l'assistente» → consenti il microfono.

Prova del webhook senza agente (con il segreto nel server):

```bash
curl -s -X POST https://<sito>/api/voice/report \
  -H 'content-type: application/json' -H "x-voice-secret: $VOICE_TOOL_SECRET" \
  -d '{"category":"buca","address":"via Roma 12","description":"Buca profonda vicino al marciapiede"}'
```

Questo crea davvero una segnalazione (descrizione che inizia con `[Telefono]`).

## Un numero di telefono vero

- **Demo**: il widget web basta, nessun numero da comprare.
- **Numero ordinario**: compra un numero su Twilio (anche italiano, richiede documenti di regolamentazione)
  e importalo in ElevenLabs → *Agents → Phone Numbers → Import number* (Account SID + Auth Token), poi
  assegnalo all'agente. In alternativa un trunk **SIP** del proprio operatore.
- **Numero verde 800 reale**: in Italia un numero 800 gratuito per chi chiama si ottiene solo con un
  contratto con un operatore (assegnazione numerazioni AGCOM, costi a carico del Comune). Twilio non vende
  numeri verdi italiani self-service. Per la demo quindi si usa un numero Twilio ordinario o il widget;
  in produzione il Comune collega il proprio 800 all'agente via SIP trunk.

## Privacy (GDPR)

- Il numero di chi chiama **non arriva al webhook e non viene salvato**: lo strumento riceve solo categoria,
  luogo e descrizione. Il prompt vieta di chiedere dati personali e di riportarli nella descrizione.
- ElevenLabs conserva trascrizioni e audio secondo le impostazioni dell'agente. Lo script imposta
  `record_voice: false`, `delete_audio: true`, `retention_days: 7`; per la produzione è consigliata la
  **zero retention** (*Agent → Advanced → Privacy*, se disponibile nel piano) o la retention minima.
  Twilio conserva i propri log delle chiamate (numero incluso): ridurne la retention nella console Twilio.
- Informativa: il primo messaggio può essere esteso con una frase breve sul trattamento dei dati
  (titolare: il Comune; responsabili: ElevenLabs, Twilio, fornitore LLM).
- Il segreto `VOICE_TOOL_SECRET` sta solo nelle variabili d'ambiente, mai nel repository.
