# Planning Docs

Questa cartella raccoglie la documentazione di progettazione del sistema FleetLab.

`PLAN.md` in root resta il piano sintetico di progetto. I file in `plan/` servono invece a descrivere in dettaglio il sistema finale, le decisioni architetturali e il percorso di realizzazione.

## Indice
- [AGENTS.md](plan/AGENTS.md): workflow operativo della fase di planning e stato corrente della pianificazione.
- [vision.md](plan/vision.md): obiettivo del prodotto, utenti target, criteri di successo e non-obiettivi.
- [architecture.md](plan/architecture.md): componenti del sistema, confini, flussi dati e principali decisioni tecniche.
- [backend-command-lifecycle.md](plan/backend-command-lifecycle.md): piano implementativo della fase backend sui comandi persistiti.
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
- schema iniziale `Prisma`, persistenza inbound e prime route di lettura persistite completate e mergiate su `main`
- stato attuale del codice:
  - API Fastify avviabile con `GET /health`
  - contratti V1 dei messaggi codificati nel backend
  - broker `MQTT` embedded integrato nel backend
  - store in-memory e prime route di lettura stato device
  - schema `Prisma` versionato nel repo
  - client `Prisma` creato dal backend a partire da `DATABASE_URL`
  - servizio di persistenza inbound device verso `PostgreSQL`
  - broker `MQTT` che inoltra i messaggi inbound sia alla proiezione in-memory sia al layer di persistenza
  - letture persistite per device state, telemetry e notifications gia' presenti in `main`
  - lifecycle persistito di `command` e `config` completato sul branch corrente:
    - creazione record `pending`
    - publish outbound su `MQTT`
    - finalizzazione `ack -> confirmed/failed`
    - route HTTP `POST /devices/:deviceMac/commands`, `POST /devices/:deviceMac/config`, `GET /commands`
- prossimo passo previsto:
  - portare eventi backend verso canali realtime per la dashboard
  - ridurre ulteriormente la dipendenza delle route e della UI dallo store in-memory
  - validare il flusso backend con un `device-simulator` end-to-end
