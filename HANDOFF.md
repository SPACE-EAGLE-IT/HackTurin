# Handoff — To.Be · un nuovo modo di vivere Torino

Stato al 11/10/2026. App in `web/` (kit IAMAimpresa + moduli To.Be), Supabase `zikhbchvfxivltrpggqf`,
Vercel progetto `torinosegnala` → https://torinosegnala.vercel.app. Repo privato (licenza del kit: solo uso evento).

Avvio locale: `cd web && nvm use 22 && pnpm dev`. Controlli: `pnpm check`, `pnpm lint`, `pnpm test` (61 verdi), `pnpm build`.

## Cosa funziona

| Area | Dove | Note |
|---|---|---|
| Mappa pubblica, segnala con GPS automatico | `/`, `/segnala` | precisione GPS, indirizzo (Nominatim), segnaposto trascinabile |
| Assistente cittadini (Claude Haiku) | pulsante «Chiedi» nell'intestazione | strumenti in sola lettura; la segnalazione la invia il cittadino. Si attiva con la chiave Anthropic |
| Assistente amministrazione (Claude Sonnet) | `/assistant` | `AI_PROVIDER/AI_MODEL/AI_API_KEY` da env |
| POD da telefono | `/pod-telefono` | collegamento via QR dalla Console POD; buche da accelerometro, rumore, segnalazioni rapide, «Simula buca» |
| API POD hardware | `docs/POD_API.md` | contratto invariato |
| Area Comune | Segnalazioni, Interventi + Percorsi, Appalti, POD, Help desk, Missioni, Fondo, Impatto, Accessi | permessi del kit; il primo account è admin |
| Volontari | `/volontari`, `/missioni`, `/missioni/attestato` | Space Eagle ETS; livelli, attestato ore, squadre aziendali, rimborsi entro 10 €/g e 150 €/mese |
| Aziende | `/aziende`, `/impatto` | giornata di volontariato 1.500 €, adozione 900 €/3 mesi, 3.500 €/anno con 2 giornate (Stripe) |
| Satellite Sentinel-2 | `/statistiche` («Dallo spazio»); mappa: pulsante «Satellite» (foto Sentinel-2 cloudless EOX, CC BY-NC-SA) e «Dati Sentinel-2» (immagine NDVI pixel per pixel da `/api/public/satellite/ndvi` + indice per CAP) | L2A da Earth Search (nessuna chiave): indice verde (NDVI) e foschia (AOT) per CAP, cache 12 h |
| Numero verde ElevenLabs | `/api/voice/report`, `/api/voice/zone`, `docs/VOICE.md` | webhook provati in locale (401 senza segreto, segnalazione creata e geolocalizzata). Si attiva con `bash scripts/voice/activate.sh` |
| Logo | `public/brand/tobe-*` | logo, versione chiara per il tema scuro, favicon e icone app ricavati dal foglio adesivi |

## Da finire (lavori interrotti dal limite di sessione)

1. **Satellite, limiti**: nella scena del 05/10/2026 l'AOT di Sen2Cor è quasi costante (0,14 = foschia leggera),
   quindi la pagina dice che la foschia è uniforme invece di inventare differenze; l'indice verde distingue bene le
   zone (colline 10131–10133 ≈ 60, Barriera/centro ≈ 11–15). Per l'NO₂ valutare Sentinel-5P (~5 km).
2. **PDF del report di sostenibilità**: la ricerca di conformità è in `docs/VSME_COMPLIANCE.md` (VSME, Omnibus,
   Direttiva 2024/825), con mappatura e dichiarazioni obbligatorie. **Non ancora fatti**:
   - la route `app/api/impatto/[id]/pdf` con `@react-pdf/renderer` (la dipendenza è già installata);
   - l'anteprima con iframe e il riquadro «Conformità VSME» nella pagina del report.
3. **Numero verde**: crea la chiave su elevenlabs.io (Developers → API Keys, permessi Agents), mettila in
   `web/.env.local` come `ELEVENLABS_API_KEY=...`, poi da `web/` lancia `bash scripts/voice/activate.sh`: genera il
   segreto, crea l'agente (LLM Claude dentro ElevenLabs), carica tutto su Vercel e ripubblica. Per un numero vero:
   importa un numero Twilio nell'agente (vedi `docs/VOICE.md`). Da provare con l'agente reale.
4. Verifica a vista delle pagine riservate da loggati (desktop 1440 e mobile 390, tema chiaro e scuro).

## Chiavi: le inserisce una persona del team, non l'assistente AI

| Variabile | Dove | Per cosa |
|---|---|---|
| `AI_API_KEY` | `web/.env.local` + Vercel (Secret) | Claude per entrambi gli assistenti. Deve essere una chiave API Anthropic (`sk-ant-api…`, da console.anthropic.com) |
| `ELEVENLABS_API_KEY` | solo `.env.local` | script di creazione dell'agente vocale |
| `VOICE_TOOL_SECRET` | `.env.local` + Vercel | `openssl rand -hex 32` |
| `NEXT_PUBLIC_ELEVENLABS_AGENT_ID`, `NEXT_PUBLIC_VOICE_NUMBER` | `.env.local` + Vercel | stampati dallo script / numero Twilio |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_BRIDGE_SECRET` | `.env.local` + Vercel | pagamenti; il bridge è il segreto Vault `ts_payment_bridge` |

Comando per Vercel (da `web/`): `vercel env add NOME production`, poi `vercel deploy --prod`.

## Sicurezza: da fare subito

- **La chiave Anthropic incollata in chat va revocata** su console.anthropic.com e sostituita: ormai è nel
  registro della conversazione.
- Su Vercel ci sono ancora `SUPABASE_SERVICE_ROLE_KEY` e `ADMIN_PASSWORD` della vecchia versione. L'app non le usa più:
  conviene rimuoverle (`vercel env rm SUPABASE_SERVICE_ROLE_KEY production`).
- La chiave di prova del POD hardware è nel kit del team POD: revocarla dalla Console POD a fine evento.

## Giuria

- Dossier: `docs/GIUDICI.md` (sorgente) e `docs/To.Be-dossier-giuria.pdf`, rigenerabile con
  `node scripts/docs/dossier-pdf.mjs` da `web/`.
- Account giuria in sola lettura: registrarlo su `/login`, poi da `web/` lanciare
  `node --env-file=.env.local scripts/demo/judge-access.mjs <email>`. A fine evento, stesso comando con `--revoke`.
- Codice: invitare i giudici sul repo privato con `gh api -X PUT repos/SPACE-EAGLE-IT/HackTurin/collaborators/<utente> -f permission=pull`.

## Dati demo

- `node --env-file=.env.local scripts/demo/seed-business.mjs [--clear]`: appalti, interventi, missioni, donazioni,
  un'adozione e una giornata di team.
- `seed-reports.mjs` e `seed-telemetry.mjs`: rilanciare telemetria prima della demo, perché la mappa mostra solo le ultime 3 ore.

## Migrazioni (già applicate su Supabase)

`web/supabase/migrations/`: base e telemetria POD, le 3 del kit, `20261011090000_torinosegnala.sql`,
`20261011120000_phone_pod_volunteering.sql` (tipo POD «phone», giornate di volontariato, squadre).
