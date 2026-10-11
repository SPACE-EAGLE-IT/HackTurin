# To.Be — un nuovo modo di vivere Torino

Dossier per la giuria · HackTurin · ottobre 2026 · Team Space Eagle

**To.Be** è la piattaforma che unisce chi vive Torino, chi la amministra e chi la vuole curare. I cittadini
segnalano i problemi in 20 secondi: con il GPS, a voce o chattando con un'assistente. Dei sensori a basso costo
(POD), anche su semplici telefoni montati sui mezzi, trovano buche e misurano l'aria. Il Comune gestisce
interventi, appalti per zona e flotta dei sensori da un'unica centrale con assistente AI. Volontari e aziende
chiudono le segnalazioni più semplici, con un modello economico sostenibile e conforme al Codice del Terzo settore.

## 1. Accessi per la giuria

| Cosa | Dove | Accesso |
|---|---|---|
| Sito pubblico (cittadini) | https://torinosegnala.vercel.app | libero, senza registrazione |
| Area del Comune | https://torinosegnala.vercel.app/login | account giuria in sola lettura (credenziali consegnate a parte) |
| Codice sorgente | https://github.com/SPACE-EAGLE-IT/HackTurin | repository privato: invito come collaboratori in lettura |
| POD da telefono | https://torinosegnala.vercel.app/pod-telefono | si collega con il QR generato nella Console POD |
| API per i POD | `docs/POD_API.md` | chiave di test su richiesta |

L'account giuria vede **tutte** le pagine dell'area del Comune: Panoramica, Segnalazioni, Interventi e Percorsi,
Appalti, POD, Help desk, Missioni, Fondo, Impatto, Assistente e Accessi. Non può creare, modificare o cancellare
nulla. I dati sono demo realistici: circa 150 segnalazioni, 8 POD, 12 interventi, 3 appalti, missioni, donazioni
e un'adozione aziendale.

## 2. Demo guidata (10 minuti)

1. **Mappa pubblica** (`/`): segnalazioni aperte raggruppate per zona. Prova anche:
   - «mostra sensori»: meteo, aria e sensori;
   - **Satellite** in alto a destra: foto Sentinel-2;
   - **Dati Sentinel-2**: indice verde pixel per pixel calcolato dall'ultima immagine Copernicus.
2. **Segnala** (`/segnala`): il GPS si attiva da solo, mostra precisione e indirizzo; foto opzionale; la
   segnalazione compare sulla mappa entro pochi secondi. Se lo stesso problema è stato segnalato nelle ultime 24 ore
   entro 25 metri, si rafforza quello esistente invece di creare un duplicato.
3. **Chiedi** (pulsante in alto): l'assistente dei cittadini su Claude. Esempi:
   - «C'è una buca in via Nizza 150»: prepara la segnalazione e la invia il cittadino;
   - «Cosa è già segnalato vicino a piazza Vittorio?»;
   - «Com'è l'aria oggi?».
4. **Statistiche** (`/statistiche`): andamento, categorie, zone più colpite, aria, «Dallo spazio» (Sentinel-2) e
   fondo dei volontari.
5. **Volontari, Aziende, Dona**: il modello economico spiegato al pubblico.
6. **Area del Comune** (accedi con l'account giuria):
   - **Panoramica**: KPI della città;
   - **Segnalazioni**: elenco o mappa con filtri; la scheda di dettaglio porta a «Crea intervento» o
     «Pubblica come missione»;
   - **Interventi → Percorsi**: giri di raccolta ottimizzati per squadra (nearest-neighbour + 2-opt,
     strade reali OSRM);
   - **Appalti**: zone CAP affidate ai gestori, con le segnalazioni aperte di zona;
   - **POD**: console IT con dispositivi, chiavi API, traffico e misure; le anomalie aprono ticket nell'Help desk;
   - **Missioni / Fondo / Impatto**: volontariato, rimborsi entro le soglie di legge, report di impatto per
     le aziende;
   - **Assistente**: domande in linguaggio naturale sui dati («quali zone hanno più rifiuti aperti?»).
7. **POD da telefono** (`/pod-telefono`): con l'accelerometro rileva le buche mentre il mezzo si muove,
   misura il rumore e invia tutto con le stesse API dei POD hardware. «Simula buca» la mostra anche da fermo.

## 3. Che problema risolve

- Le segnalazioni oggi arrivano sparse (telefonate, email, social), senza posizione precisa e con molti duplicati.
- Il Comune non ha una vista unica per zona né strumenti per pianificare gli interventi.
- Sensori e dati aperti (meteo, aria, satellite) esistono ma non sono collegati ai problemi del territorio.
- Cittadini e aziende vorrebbero contribuire, ma mancano canali semplici e legalmente corretti.

## 4. Funzionalità

| Area | Cosa fa |
|---|---|
| Segnalazioni | GPS automatico con precisione e indirizzo, foto, deduplicazione (stessa categoria, 25 m, 24 ore), priorità per gravità e numero di conferme, CAP |
| Canali | Web e mobile, assistente in chat (Claude), numero verde vocale (ElevenLabs Agents, in attivazione), POD hardware, telefoni-POD |
| POD hardware | Arduino UNO Q del team: fissi ai semafori o mobili sui bus; chiavi API per dispositivo, heartbeat, batteria, misure e log |
| Telefono come POD | Webapp collegata via QR: buche dall'accelerometro, rumore stimato, segnalazioni rapide, coda offline |
| Dati ambientali | Open-Meteo e CAMS (aria), Sensor.Community, misure dei POD, Sentinel-2 L2A (NDVI e AOT per CAP e immagine NDVI) |
| Gestione del Comune | Interventi collegati alle segnalazioni (chiuderli risolve la segnalazione), percorsi ottimizzati, appalti per zona, help desk dei sensori, permessi per ruolo |
| Assistente AI | Claude con strumenti di sola lettura sui dati; le azioni (crea intervento, pubblica missione) sono proposte che l'operatore conferma |
| Volontari | Missioni su segnalazioni reali, foto prima e dopo, verifica del Comune, livelli e attestato delle ore, rimborsi entro i limiti di legge |
| Aziende | Giornate di volontariato aziendale e adozione di zone, report di impatto, pagamenti con Stripe |

## 5. Modello di business

| Flusso | Chi paga | Valore |
|---|---|---|
| Licenza SaaS al Comune (B2G) | Comune / municipalizzate | Centrale segnalazioni, interventi, appalti, sensori, assistente. Rif. di mercato: FixMyStreet Pro 15–56 k£/anno, SeeClickFix 20–39 k$/anno |
| POD | Comune / aziende di trasporto | Hardware a basso costo + telefoni già in dotazione ai mezzi |
| Volontariato aziendale | Aziende → Space Eagle ETS | Giornata di team 1.500 €, adozione di zona 900 € a trimestre o 3.500 €/anno con 2 giornate; report di impatto per il bilancio di sostenibilità (VSME) |
| Donazioni | Cittadini e imprese → Space Eagle ETS | Fondo trasparente per materiali e rimborsi spese, deducibile (art. 83 CTS) |

Le aziende finanziano il programma volontari, quindi non dipende dalle sole donazioni. I volontari non sono pagati:
ricevono riconoscimento (livelli e attestato delle ore, utile per CV e PCTO) e solo rimborsi spese.

## 6. Conformità e scelte responsabili

- **Volontariato**: art. 17 del Codice del Terzo settore. Rimborsi autocertificati entro 10 € al giorno e 150 € al
  mese, bloccati direttamente dal database. Missioni dentro un patto di collaborazione (Regolamento beni comuni
  di Torino n. 391), con l'assicurazione dell'ETS.
- **Report per le aziende**: impostato sullo standard volontario VSME (Raccomandazione UE 2025/1710). Dichiara
  solo il contributo al territorio, non riduzioni o compensazioni dell'impronta dell'azienda, come richiede la
  Direttiva (UE) 2024/825 contro il greenwashing. Analisi completa in `docs/VSME_COMPLIANCE.md`.
- **Privacy**:
  - segnalazioni anonime;
  - nessun dato personale chiesto dagli assistenti;
  - il numero di chi chiama non viene salvato;
  - l'audio del telefono-POD è elaborato sul dispositivo e mai registrato.
- **Sicurezza**:
  - accesso per ruolo su ogni tabella (Row Level Security);
  - l'app non usa mai la chiave amministrativa del database;
  - le chiavi dei POD sono salvate solo come hash;
  - pagamenti verificati con un segreto nel Vault;
  - limiti di frequenza sugli endpoint pubblici.
- **Dati satellitari**: «Contiene dati Copernicus Sentinel modificati 2026». Sono stime, presentate come tali: l'NO₂
  non si misura con Sentinel-2.

## 7. Architettura

```
Cittadini (web, chat, telefono)      POD hardware e telefoni-POD
              │                               │  API v1 con chiave (hash)
              ▼                               ▼
     Next.js 16 su Vercel ── funzioni SQL sicure ──► Supabase (Postgres + PostGIS, RLS, Vault, Storage)
              │
              ├── Claude (assistenti)            ├── ElevenLabs Agents (numero verde)
              ├── Open-Meteo, Sensor.Community   ├── Sentinel-2 L2A (Earth Search, AWS Open Data)
              └── OSRM (percorsi), Nominatim     └── Stripe (donazioni e piani aziende)
```

Stack: Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4, design system IAMAimpresa, MapLibre,
Supabase, Vercel. Controlli automatici: typecheck, regole di stile, lint e 67 test unitari.

## 8. Struttura del repository

| Cartella | Contenuto |
|---|---|
| `web/` | la piattaforma (app, API, migrazioni del database in `web/supabase/migrations`) |
| `docs/` | `POD_API.md` (contratto dei sensori), `VOICE.md` (numero verde), `VSME_COMPLIANCE.md`, questo dossier |
| `unoq-app/`, `contract/`, `tools/` | il POD hardware su Arduino UNO Q (BusSense) e i suoi strumenti |
| `HANDOFF.md` | stato tecnico, variabili d'ambiente, cosa resta da fare |

Avvio locale: `cd web && pnpm install && pnpm dev` (Node 22, variabili in `.env.example`).

## 9. Limiti noti, detti con onestà

- Il **numero verde** ha il backend pronto e provato. Va attivato con la chiave ElevenLabs e un numero Twilio;
  un vero numero verde 800 richiede un contratto con un operatore.
- Il **PDF del report di sostenibilità**: la ricerca di conformità è completa; la generazione del PDF è in lavorazione
  (oggi il report si stampa dal browser).
- I **CAP** sono stimati dal centroide più vicino; in produzione si useranno i confini ufficiali.
- La **foto satellitare** di sfondo (EOX Sentinel-2 cloudless) è gratuita solo per uso non commerciale.
- I **pagamenti Stripe** funzionano in modalità test.
- Il **design system** del kit IAMAimpresa è usato con la licenza dell'evento: per l'uso commerciale va chiesto il
  permesso o sostituito.

## 10. Roadmap

1. Pilota con una circoscrizione e con una flotta di mezzi.
2. Confini CAP e quartieri ufficiali (Open Data del Comune di Torino).
3. Integrazione con i sistemi del gestore dei rifiuti.
4. Sentinel-5P per l'NO₂ e serie storiche dell'indice verde.
5. App installabile con notifiche ai cittadini quando la loro segnalazione viene risolta.
