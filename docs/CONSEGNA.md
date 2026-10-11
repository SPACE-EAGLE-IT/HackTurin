# To.Be — un nuovo modo di vivere Torino

Team Space Eagle · HackTurin 2026

- Sito: https://torinosegnala.vercel.app
- Codice (GitHub, repo pubblica): https://github.com/SPACE-EAGLE-IT/HackTurin
- Video: [LINK AL VIDEO]

---

## Il problema

A Torino un problema urbano (una buca, rifiuti abbandonati, un lampione spento, un cassonetto pieno) arriva al
Comune per strade diverse: telefonate, email, social, app diverse. Spesso arriva senza una posizione precisa, più
volte da persone diverse, oppure non arriva affatto. Chi deve intervenire non ha una vista unica per zona: non sa
dove si concentrano i problemi, non riesce a pianificare i giri delle squadre e non misura quanto tempo serve a
risolverli.

Intanto i dati che servirebbero esistono già ma restano scollegati:
- i bus e i mezzi comunali percorrono ogni giorno tutta la città;
- i telefoni di tutti hanno GPS, accelerometro e fotocamera;
- ci sono sensori ambientali e immagini satellitari gratuite del programma europeo Copernicus.

Infine molti cittadini e molte aziende vorrebbero prendersi cura del proprio quartiere, ma mancano canali semplici,
riconosciuti e corretti dal punto di vista legale.

## La soluzione

**To.Be** è una piattaforma unica che collega chi vive Torino, chi la amministra e chi la vuole curare.

1. **Segnalare in 20 secondi, senza registrazione.**
   - Web e smartphone: il GPS si attiva da solo e mostra precisione e indirizzo; la foto è facoltativa.
   - Chat con un'assistente AI (Claude): basta scrivere «c'è una buca in via Nizza 150», l'assistente prepara la
     segnalazione e la invia il cittadino.
   - Numero verde con agente vocale (ElevenLabs).
   - Le segnalazioni doppie vengono unite: stessa categoria, entro 25 metri, nelle ultime 24 ore.
2. **Sensori che girano per la città (POD).**
   - Il POD hardware, basato su Arduino UNO Q e un telefono Android, va sui bus o ai semafori. Rileva buche, misura
     temperatura, umidità e qualità dell'aria (VOC) e invia tutto alla piattaforma con una chiave API per dispositivo.
   - Qualsiasi telefono può diventare un POD con la nostra web app: si collega con un QR e riconosce le buche
     dall'accelerometro mentre il mezzo si muove.
3. **Dati ambientali e dallo spazio.**
   - Meteo e qualità dell'aria (Open-Meteo/CAMS), sensori Sensor.Community e misure dei POD.
   - Immagini Sentinel-2 del programma Copernicus: sulla mappa la vista satellitare e l'indice del verde (NDVI)
     calcolato pixel per pixel dall'ultima immagine senza nuvole; nelle statistiche verde e foschia per CAP.
4. **La centrale del Comune.**
   - Segnalazioni su mappa e in elenco per zona.
   - Interventi collegati alle segnalazioni: quando l'intervento si chiude, la segnalazione risulta risolta.
   - Giri delle squadre ottimizzati sulle strade reali.
   - Appalti per zona CAP.
   - Console per gestire sensori e chiavi API, con help desk per i guasti.
   - Assistente AI che risponde sui dati («quali zone hanno più rifiuti aperti?») e propone azioni che l'operatore
     conferma.
5. **Cittadini e aziende che curano la città, con un modello sostenibile.**
   - I volontari prendono una missione su una segnalazione reale, la documentano con foto prima e dopo e il Comune la
     verifica.
   - Non sono pagati: ricevono un attestato delle ore e solo rimborsi spese entro i limiti di legge
     (10 € al giorno, 150 € al mese, art. 17 del Codice del Terzo settore).
   - Le aziende comprano giornate di volontariato per i propri team e adottano zone della città. In cambio ricevono un
     report di impatto impostato sullo standard europeo per le PMI (VSME), senza dichiarazioni di greenwashing.
   - Le entrate vanno all'associazione partner Space Eagle ETS e finanziano il programma.

**Modello di business**
- Licenza SaaS al Comune; riferimenti di mercato: FixMyStreet Pro 15–56 mila £/anno, SeeClickFix 20–39 mila $/anno.
- Vendita dei POD.
- Volontariato aziendale e adozioni di zona: giornata 1.500 €, adozione 900 € a trimestre o 3.500 € all'anno.
- Donazioni deducibili all'ETS.

**Tecnologie**
- Piattaforma: Next.js 16 su Vercel, Supabase (Postgres + PostGIS con permessi per ruolo su ogni tabella), MapLibre.
- Servizi esterni: Claude (assistenti), ElevenLabs Agents (voce), Stripe (pagamenti), Sentinel-2 L2A (AWS Open Data).
- POD: Arduino UNO Q (Linux + microcontrollore) con app Android in Kotlin.

## Video

[LINK AL VIDEO]

Scaletta consigliata (2–3 minuti):

| Tempo | Scena |
|---|---|
| 0:00 | Una buca vera per strada: «Oggi segnalarla è difficile» |
| 0:15 | Il POD a forma di Mole sul cruscotto: il telefono rileva la buca e la segnalazione compare sulla mappa |
| 0:45 | Un cittadino segnala dal telefono (GPS automatico), poi scrive all'assistente in chat |
| 1:15 | La vista satellitare e l'indice del verde Sentinel-2 sulla mappa |
| 1:35 | Il Comune: segnalazione → intervento → giro ottimizzato della squadra; la console dei POD |
| 2:10 | Volontari e aziende: missione, attestato, report di impatto |
| 2:30 | «To.Be — un nuovo modo di vivere Torino» |

## Foto del prodotto

Schermate della piattaforma (cartella `docs/media/` del repository):

| File | Cosa mostra |
|---|---|
| `00-logo.png` | Il logo To.Be |
| `01-mappa-satellite-ndvi.jpg` | Mappa pubblica con vista satellitare Sentinel-2, indice del verde per pixel e per CAP |
| `02-segnala-gps.jpg` | Segnalazione da telefono con GPS automatico (±9 m) e indirizzo |
| `03-statistiche-sentinel2.jpg` | Statistiche «Dallo spazio»: foschia e zone meno verdi |
| `04-assistente-claude.jpg` | L'assistente prepara la segnalazione, il cittadino conferma |
| `05-aziende.jpg` | I piani per le aziende |

Foto del POD fisico (da aggiungere: [FOTO POD 1], [FOTO POD 2]): contenitore Mole Antonelliana stampato in 3D,
scheda e sensori, montaggio sul mezzo.

## Schemi

**Architettura del sistema**

```
 Cittadini (web, chat AI, numero verde)            POD sul mezzo / al semaforo
            │                                  ┌────────────────────────────────────────┐
            │                                  │ Telefono Android (app Kotlin):          │
            │                                  │ GPS · accelerometro · fotocamera ·      │
            │                                  │ hotspot Wi-Fi + 5G                      │
            │                                  └───────────────┬────────────────────────┘
            │                                                  │ Wi-Fi, WebSocket :8765
            │                                  ┌───────────────▼────────────────────────┐
            │                                  │ Arduino UNO Q – Linux (Python BusSense):│
            │                                  │ fusione eventi, coda offline, invio API │
            │                                  │ UNO Q – MCU STM32: sensori I2C/analog.  │
            │                                  └───────────────┬────────────────────────┘
            ▼                                                  │ HTTPS, API v1 con chiave (hash)
   To.Be su Vercel (Next.js) ◄─────────────────────────────────┘
            │ funzioni SQL sicure
            ▼
   Supabase: Postgres + PostGIS, permessi per ruolo, Vault, foto
   Servizi: Claude · ElevenLabs · Stripe · Open-Meteo · Sensor.Community · Sentinel-2 · OSRM
```

**Collegamenti del POD (dagli sketch `unoq_sensori.ino` e `unoq_registratore.ino`)**

```
Arduino UNO Q (ABX00162) + Seeed Grove Base Shield
 ├─ Qwiic (Wire1, 3,3 V) ── Arduino Modulino Movement (IMU LSM6DSOX, 0x6A)
 ├─ Grove I2C (Wire)    ─┬─ AHT20 temperatura/umidità   0x38
 │                       ├─ SGP30 TVOC / CO2eq            0x58
 │                       └─ display OLED 0,96"            0x3C
 ├─ A0 (Grove analog.)  ── sensore di luce (lampioni spenti)
 ├─ D2 ↔ GND (INPUT_PULLUP) ── pulsante tattile 12×12 (segnalazione manuale)
 └─ USB-C 5 V / 3 A        ── alimentatore USB-C PD (sul mezzo: convertitore 12/24 V → 5 V, previsto)
Telefono Android ⇄ UNO Q: Wi-Fi (hotspot del telefono), WebSocket porta 8765
```

Contenitore: «Mole Antonelliana» stampabile in 3D senza supporti, generato in Fusion 360 da `mole/mole_v1.py` e
`mole/mole_v2.py` (modello in `mole.f3d`). È composto da:
- piano terra con il vano per la UNO Q;
- primo piano con le guide per OLED e sensore di luce e la tasca del pulsante;
- cupola con feritoie di aerazione e guglia.

## BOM — distinta materiali del POD

Prezzi indicativi di listino (IVA inclusa), da verificare al momento dell'acquisto.

| # | Componente | Q.tà | Ruolo | ≈ € |
|---|---|---|---|---|
| 1 | Arduino UNO Q 2 GB (ABX00162) | 1 | Linux (fusione, coda, invio) + MCU (sensori) | 45 |
| 2 | Seeed Grove Base Shield | 1 | connettori Grove I2C/analogici | 6 |
| 3 | Arduino Modulino Movement (LSM6DSOX) | 1 | IMU di bordo (vibrazioni, buche) | 15 |
| 4 | Grove AHT20 | 1 | temperatura e umidità | 6 |
| 5 | Grove SGP30 | 1 | composti organici volatili (TVOC) | 18 |
| 6 | Grove OLED 0,96" | 1 | stato del dispositivo | 7 |
| 7 | Grove sensore di luce | 1 | illuminazione stradale | 3 |
| 8 | Pulsante tattile 12×12 + cavi Grove/Qwiic | 1 set | segnalazione manuale, cablaggio | 5 |
| 9 | Alimentatore USB-C PD 5 V/3 A + cavo (sul mezzo: convertitore 12/24 V → 5 V) | 1 | alimentazione | 15 |
| 10 | Contenitore Mole (PLA/PETG, ~80 g) | 1 | case stampato in 3D | 3 |
| 11 | Telefono Android con GPS (es. Samsung Galaxy A26 5G, anche ricondizionato) | 1 | GPS, IMU, fotocamera, connettività 5G | 0–300 |
| | **Totale senza telefono** | | | **≈ 125** |

Il telefono può essere uno dismesso: i dispositivi aziendali vecchi diventano sensori invece di finire nei rifiuti
elettronici. Per misure di qualità dell'aria a valore scientifico, il progetto prevede l'evoluzione verso
Sensirion SCD41 (CO2 vera) e SEN66 (particolato PM1–PM10), circa 100–150 € in più.

**Alternativa senza hardware:** qualunque telefono diventa un POD aprendo `/pod-telefono` e inquadrando il QR della
Console POD. Costo hardware: zero.

## Materiali aggiuntivi (nel repository)

| Documento | Contenuto |
|---|---|
| `docs/To.Be-dossier-giuria.pdf` | Dossier completo: funzionalità, demo guidata, architettura, limiti, roadmap |
| `docs/POD_API.md` | Contratto delle API per i sensori, compreso il telefono come POD |
| `docs/VSME_COMPLIANCE.md` | Analisi di conformità del report per le aziende (VSME, Omnibus, Direttiva UE 2024/825) |
| `docs/VOICE.md` | Il numero verde vocale: funzionamento, privacy, attivazione |
| `PIANO.md`, `unoq-app/README.md`, `contract/phone_link.v1.md` | Progetto del POD hardware e protocollo telefono ⇄ UNO Q |
| `mole/`, `mole.f3d` | Contenitore 3D a forma di Mole Antonelliana |
| `web/supabase/migrations/` | Schema completo del database |

**Accesso all'area del Comune per la giuria:** account in sola lettura, credenziali consegnate a parte.
