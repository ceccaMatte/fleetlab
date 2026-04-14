# Planning Docs

Questa cartella raccoglie la documentazione di progettazione del sistema FleetLab.

`PLAN.md` in root resta il piano sintetico di progetto. I file in `plan/` servono invece a descrivere in dettaglio il sistema finale, le decisioni architetturali e il percorso di realizzazione.

## Indice
- [AGENTS.md](plan/AGENTS.md): workflow operativo della fase di planning e stato corrente della pianificazione.
- [vision.md](plan/vision.md): obiettivo del prodotto, utenti target, criteri di successo e non-obiettivi.
- [architecture.md](plan/architecture.md): componenti del sistema, confini, flussi dati e principali decisioni tecniche.
- [message-contracts.md](plan/message-contracts.md): specifica V1 dei topic MQTT, payload e lifecycle di command/config.
- [roadmap.md](plan/roadmap.md): sequenza delle fasi di realizzazione, milestone e dipendenze principali.
- [requirements.md](plan/requirements.md): requisiti funzionali e operativi, vincoli e assunzioni correnti.

## Stato Documenti
- `AGENTS.md`: workflow di planning definito
- `vision.md`: visione prodotto definita
- `architecture.md`: prima versione architetturale definita
- `message-contracts.md`: specifica V1 dei messaggi definita
- `requirements.md`: prima versione requisiti definita
- `roadmap.md`: roadmap riallineata alle decisioni architetturali

## Stato Implementazione
- repository setup completato e mergiato su `main`
- backend foundation completata e mergiata su `main`
- slice `MQTT` backend completata e mergiata su `main`
- stato attuale del codice:
  - API Fastify avviabile con `GET /health`
  - contratti V1 dei messaggi codificati nel backend
  - broker `MQTT` embedded integrato nel backend
  - store in-memory e prime route di lettura stato device
  - schema `Prisma` versionato nel repo
  - client `Prisma` creato dal backend a partire da `DATABASE_URL`
  - servizio di persistenza inbound device verso `PostgreSQL`
  - broker `MQTT` che inoltra i messaggi inbound sia alla proiezione in-memory sia al layer di persistenza
  - branch corrente `feat/db-read-routes` aggiunge letture persistite per device state, telemetry e notifications
- prossimo passo previsto:
  - completare il percorso persistito dei comandi e dei relativi ACK
  - ridurre ulteriormente la dipendenza delle route e della UI dallo store in-memory
