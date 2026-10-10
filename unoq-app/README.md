# BusSense: App per la UNO Q (lato Linux)

Riceve i dati dal telefono (WebSocket, porta 8765) e li salva in `/app/data`:

| Percorso | Contenuto |
|---|---|
| `reports/reports-AAAAMMGG.log` | Una **riga BS1** per segnalazione (GPS + tipo) |
| `journal/obs-AAAAMMGG.jsonl` | Il record completo di ogni segnalazione |
| `events.db` | Segnalazioni (SQLite, WAL) |
| `ts.db` | Traccia GPS a 1 Hz, con IMU e CO2/VOC dal MCU (SQLite, WAL) |
| `media/` | Solo immagini **oscurate** (vuota finché `privacy.redact` non è implementata) |

L'ultima foto ricevuta resta solo in RAM, in `/dev/shm/bussense/latest.jpg`. Serve alla visione e non viene mai scritta su disco.

**Collaudo:** con `BUSSENSE_DEBUG_SAVE_FRAMES=1` ogni foto "frame" viene salvata anche su disco in
`data/debug_frames/` (non oscurata, rotazione automatica agli ultimi ~300 file). Solo per i test:
non lasciarlo attivo sul bus, perché scrive le foto senza oscuramento di volti/targhe.

## Provare sul PC (senza telefono)

```bash
pip install -r python/requirements.txt
```
```bash
cd python && BUSSENSE_DATA=./data python main.py
```
In un secondo terminale:
```bash
python tools/mock/mock_phone.py --url ws://127.0.0.1:8765/phone --seconds 20
```
Atteso:
- 2 eventi confermati (una buca e una frenata);
- il duplicato della buca scartato;
- le righe BS1 in `data/reports/`.

## Sulla UNO Q

**Con App Lab**
1. Crea un'app "BusSense" e copia `python/` dentro la sua cartella `python/`.
2. Verifica che la porta 8765 sia esposta: vedi `app.yaml`, il formato è **da verificare**.
3. I sensori arrivano dallo sketch con `Bridge.notify("cabin_co2", co2, t, rh)` e `Bridge.notify("cabin_voc", sraw, idx)` (PIANO.md §7.2).

**Senza App Lab, per i primi test**
```bash
python3 -m venv ~/bs && ~/bs/bin/pip install -r python/requirements.txt
```
```bash
cd python && BUSSENSE_DATA=~/bussense-data ~/bs/bin/python main.py
```

## Dove si aggancia il resto

- **Visione (R2):**
  - imposta `rx.on_frame = funzione(jpeg, meta)`, che riceve le foto già selezionate dal telefono;
  - per ogni rilevamento chiama `rx.report(type=..., src="vision", conf=..., ts_ms=meta["ts_ms"], lat=meta["lat"], ...)`.
- **Privacy:** implementa `bussense/privacy.py`. Finché restituisce `None`, nessuna immagine viene salvata (fail-closed).
