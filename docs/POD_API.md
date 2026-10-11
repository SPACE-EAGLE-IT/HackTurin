# API per i POD (v1)

Base URL: `https://<dominio-vercel>` (in locale: `http://localhost:3000`)

Ogni POD ha una **chiave API** (`ts_live_...`) legata al suo dispositivo. Va inviata in ogni richiesta:

```
Authorization: Bearer ts_live_xxxxxxxxxxxx
Content-Type: application/json
```

La chiave non va mai messa nel codice pubblicato: usate una variabile d'ambiente / file di config sul POD.

## POST /api/v1/reports — invia una segnalazione

| campo | tipo | note |
|---|---|---|
| `category` | string | `rifiuti_abbandonati`, `cassonetto_pieno`, `buca`, `graffiti`, `illuminazione`, `altro` |
| `lat`, `lon` | number | gradi decimali (WGS84), deve essere nell'area di Torino |
| `confidence` | number 0–1 | quanto il POD è sicuro (default 1) |
| `captured_at` | string ISO-8601 | opzionale, es. `2026-10-10T09:30:00Z` |
| `description` | string ≤ 500 | opzionale |
| `photo_base64` | string | opzionale, JPEG in base64 (max ~5 MB) |
| `metadata` | object | opzionale, dati liberi (es. `{"model":"yolo-v8n"}`) |

Risposta `201`: `{"id": "<uuid>", "deduped": false}`.
`deduped: true` = esisteva già una segnalazione uguale entro 25 m nelle ultime 24 h: è stata rafforzata (confidence/osservazioni), non duplicata. **Non è un errore.**

```bash
curl -X POST "$BASE/api/v1/reports" \
  -H "Authorization: Bearer $POD_KEY" -H "Content-Type: application/json" \
  -d '{"category":"rifiuti_abbandonati","lat":45.0703,"lon":7.6869,"confidence":0.87}'
```

## POST /api/v1/readings — misure dei sensori (CO₂, temperatura, …)

Una misura singola:

```json
{"lat": 45.0703, "lon": 7.6869, "captured_at": "2026-10-10T09:30:00Z",
 "metrics": {"temperature_c": 21.5, "humidity_pct": 58, "co2_ppm": 480, "pm25_ugm3": 12.3, "noise_db": 62}}
```

oppure un lotto (max 100, utile dopo un periodo senza rete): `{"readings": [ {...}, {...} ]}`.
`lat`/`lon` sono facoltativi per i POD fissi (si usa la loro posizione), consigliati per i bus.

Nomi metrica consigliati (così piattaforma e mappa li riconoscono con nome e unità):

| nome | unità |
|---|---|
| `temperature_c` | °C |
| `humidity_pct` | % |
| `co2_ppm` | ppm |
| `pm25_ugm3`, `pm10_ugm3`, `no2_ugm3` | µg/m³ |
| `noise_db` | dB |
| `pressure_hpa` | hPa |
| `voc_index` | indice |

Altri nomi sono accettati se in `snake_case` minuscolo con valore numerico (max 30 metriche per misura).
Risposta `201`: `{"stored": 1}`.

## POST /api/v1/heartbeat — "sono vivo" + posizione

Da inviare ogni 1–5 minuti. Per i POD **mobili (bus)** è così che la mappa mostra la posizione.

| campo | tipo |
|---|---|
| `lat`, `lon` | number (opz.) |
| `battery` | number 0–100 (opz.) |
| `firmware` | string (opz.) |
| `metrics` | oggetto (opz.), stesse metriche di `/readings` |

Risposta `200`: `{"ok": true}`.

## Errori

| codice | significato |
|---|---|
| 401 | chiave mancante, errata, revocata o dispositivo disattivato |
| 422 | payload non valido o categoria sconosciuta (`details` spiega quale campo) |
| 401 dopo che funzionava | la chiave è stata revocata o il POD disattivato dalla Console IT |
| 500 | errore server: riprovare con backoff |

Ogni richiesta (anche quelle sbagliate) compare in tempo reale nella **Console IT** (`/comune/pod`) con il contenuto inviato: è il modo più rapido per fare debug.

Consiglio: se la rete è assente, accodate le segnalazioni sul POD e reinviatele con il loro `captured_at` originale.

## Telefono come POD

Qualsiasi smartphone può fare da POD (su un camion dei rifiuti, un mezzo comunale, la bici di un volontario)
aprendo la pagina web `/pod-telefono`: nessuna app da installare.

**Collegamento.** Console POD → **Nuovo POD** → tipo **Telefono**. Dopo la creazione la finestra della chiave
mostra la scheda «Telefono» con un QR e il link `https://<dominio>/pod-telefono#k=<chiave>`. La chiave è nel
**frammento** dell'URL (dopo `#`): il browser non lo invia mai al server, quindi non finisce nei log. La pagina
la salva nel telefono (`localStorage`, voce `ts-pod-key`) e la toglie subito dalla barra degli indirizzi.
«Scollega telefono» la cancella. Servono HTTPS (o `localhost`) per GPS, accelerometro e schermo sempre acceso.

**Cosa invia** (stesse API e stessa chiave di un POD hardware):

| quando | chiamata | contenuto |
|---|---|---|
| scossone verticale oltre soglia (≈7 m/s², sensibilità Bassa/Media/Alta), velocità ≥ 8 km/h, GPS ≤ 30 m, almeno 2 s e 25 m dall'ultima buca | `POST /reports` | `category: "buca"`, `confidence` 0,5–0,95 in base al picco |
| pulsanti «Segnalazione rapida» | `POST /reports` | `rifiuti_abbandonati`, `cassonetto_pieno`, `illuminazione`, `graffiti`, `confidence: 1` |
| ogni 60 s | `POST /heartbeat` | `lat`, `lon`, `battery`, `firmware: "phone-web 1.0"`, `metrics.speed_kmh`, `metrics.noise_db` |
| ogni 60 s, se il rumore è attivo | `POST /readings` | `metrics.noise_db` (media del minuto, **stimata**); `lat`/`lon` solo dentro Torino |

Campi di `metadata` nelle segnalazioni:

| campo | significato |
|---|---|
| `source` | `"phone"` (rilevata dai sensori) o `"phone_manual"` (pulsante) |
| `peak_ms2` | picco dello scossone in m/s² (gravità esclusa) |
| `speed_kmh` | velocità GPS al momento del rilevamento |
| `accuracy_m` | precisione GPS in metri |
| `simulated` | `true` per le buche finte del pulsante «Simula buca» (demo) |

Il microfono è facoltativo e spento di default: l'audio è elaborato sul telefono, mai registrato né inviato;
parte solo il livello medio in dB. Senza rete le segnalazioni restano in coda sul telefono e vengono reinviate
al ritorno della connessione (o al heartbeat successivo) con il loro `captured_at` originale.
