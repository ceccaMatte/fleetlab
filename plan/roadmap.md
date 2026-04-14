# Roadmap

## Scopo
Tradurre la visione e l'architettura in una sequenza di delivery ordinata, con milestone piccole, verificabili e adatte a PR reviewable.

## Fase 1: Repository Setup
- Definire workspace, workflow, lint, formatting, test runner, CI base e template PR.
- Verifica minima:
  - `git diff --check`
  - `git status --short`
  - comando di validazione del workspace quando presente
- Nota: nessuna feature di prodotto in questa fase.

## Fase 2: Architettura Tecnica E Contratti
- Formalizzare protocollo applicativo tra device, simulator e backend.
- Definire shape dei messaggi `MQTT`, convenzioni di conferma comando e struttura dei canali realtime verso la dashboard.
- Chiarire modello `event log + projection` per persistenza e lettura.
- Verifica minima:
  - review documentale
  - controllo coerenza tra `vision.md`, `architecture.md`, `requirements.md` e `PLAN.md`

## Fase 3: Skeleton Applicativi
- Creare gli skeleton di:
  - backend monolitico modulare
  - dashboard web
  - device simulator
  - firmware ESP32 con `ESP-IDF`
- Ogni skeleton deve avere entrypoint chiaro ma nessuna feature business completa.
- Verifica minima:
  - avvio locale dei package
  - health check base
  - build minima del firmware o conferma del toolchain setup
- Stato:
  - backend skeleton completato e mergiato su `main`
  - simulator, dashboard e firmware ancora da scaffolding

## Fase 4: Persistenza E Stato Corrente
- Definire lo schema iniziale del database.
- Introdurre log eventi per telemetria, notifiche e comandi.
- Introdurre proiezioni di stato corrente per device e stato confermato del LED.
- Verifica minima:
  - validazione schema
  - controllo query di lettura di stato corrente
- Stato:
  - schema iniziale `Prisma` completato e mergiato su `main`
  - wiring del client `Prisma` nel backend completato e mergiato su `main`
  - il backend ha ancora una proiezione di stato in-memory utile come appoggio temporaneo per lo sviluppo
  - persistenza inbound `MQTT` e aggiornamento della proiezione persistita completati e mergiati su `main`
  - prossima sotto-fase: query di lettura dal database e disaccoppiamento progressivo dallo store in-memory

## Fase 5: Ingestione Device
- Implementare primo flusso device o simulator -> `MQTT` -> backend -> database.
- Persistire telemetria e notifiche.
- Aggiornare le proiezioni di stato in backend.
- Verifica minima:
  - test mirati sul flusso di ingestione
  - controllo persistenza dati e aggiornamento proiezioni
- Stato:
  - ingestione `MQTT` verso backend e proiezione in-memory completate e mergiate su `main`
  - `main` registra i device, salva gli eventi inbound e sincronizza la proiezione persistita
  - `main` espone letture backend dal database per stato device, telemetry e notifications
  - prossimo step operativo: completare il primo ciclo persistito dei comandi e delle conferme

## Fase 6: Dashboard Realtime
- Implementare bootstrap `snapshot + stream`.
- Collegare `WebSocket` allo store centrale osservabile.
- Mostrare stato device, telemetria recente e notifiche persistite.
- Verifica minima:
  - test dei reducer o listener dello store
  - verifica manuale del refresh realtime

## Fase 7: Comandi Remoti Con Conferma
- Implementare invio comando dalla dashboard al backend.
- Rifiutare subito i comandi se il device e' offline.
- Salvare i comandi come `pending` e finalizzarli dopo ACK del device.
- Aggiornare la UI solo dopo conferma reale.
- Verifica minima:
  - test backend su `pending -> confirmed/failed`
  - test manuale di assenza optimistic UI
- Stato:
  - backend command lifecycle completato sul branch `feat/command-lifecycle`
  - route HTTP disponibili per `command`, `config` e bootstrap `GET /commands`
  - prossimo passo backend: propagare aggiornamenti realtime verso la dashboard e consolidare il read side persistito

## Fase 8: Hardening
- Rifinire logging, error handling, seed dati e test end-to-end.
- Validare il comportamento con simulator e firmware reale.
- Verifica minima:
  - test end-to-end del percorso base
  - verifica manuale con almeno un device simulato e uno reale quando disponibile

## Regole Di Delivery
- Una PR per una decisione tecnica o uno scaffolding step.
- Nessuna espansione di scope dentro una PR gia' aperta.
- Le idee non ancora pianificate vanno registrate come follow-up.
