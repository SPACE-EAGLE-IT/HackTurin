# BusSense Torino — HackTurin 2026

Sensore urbano di citizen science da montare su un bus GTT: uno smartphone (Galaxy A26 5G) raccoglie
GPS, foto e IMU e li invia a una Arduino UNO Q, che riconosce buche, rifiuti e cassonetti pieni e
salva una segnalazione locale con posizione GPS.

- [PIANO.md](PIANO.md) — architettura e piano di lavoro
- [STATUS.md](STATUS.md) — stato attuale del progetto e punti aperti

## Struttura

| Cartella | Contenuto |
|---|---|
| `contract/` | Contratto del protocollo telefono ↔ UNO Q (`phone_link.v1`) |
| `phone/android-app/` | App Android (Kotlin) + APK di debug `BusSense-debug.apk` |
| `unoq-app/` | App App Lab per la UNO Q, lato Linux (server WebSocket Python, SQLite) |
| `unoq_sensori/`, `unoq_registratore/`, `unoq_diag/` | Sketch per il MCU STM32 della UNO Q |
| `tools/` | Script di supporto: generazione dataset, telefono finto per i test |
| `dataset/` | Immagini per l'addestramento (buca, cassonetto_pieno, rifiuti) — fonti in `dataset/ATTRIBUTION.md` |
| `mole/` | Script Fusion 360 per il case a forma di Mole Antonelliana |

Non sono nel repo: il virtualenv `.venv-ml`, la cache Hugging Face `dataset_cache/` (rigenerabile con
`tools/dataset/build_dataset.py`), le cartelle di build e le foto di debug non oscurate.
