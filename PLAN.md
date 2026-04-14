# FleetLab Project Plan

## Obiettivo del progetto
FleetLab e' un progetto di apprendimento per usare Codex come agent di sviluppo principale in modo disciplinato. L'obiettivo e' costruire un sistema reale per monitorare e controllare dispositivi ESP32, partendo da una base controllata: firmware ESP32, `device-simulator`, backend API, database e web dashboard.

Nota decisionale: in questa fase il focus e' imparare un flusso di lavoro solido, non massimizzare la feature surface.

## Architettura di Alto Livello
- `esp32-firmware` invia telemetria, notifiche e riceve comandi remoti tramite `MQTT`.
- `device-simulator` emula il comportamento del firmware reale usando lo stesso protocollo.
- `backend` e' un monolite modulare che valida eventi, gestisce comandi, persiste i dati ed espone API HTTP e realtime.
- `database` persiste storico e proiezioni di stato corrente.
- `web-dashboard` mostra stato, trend, notifiche e controlli operativi.

Il flusso principale e': `esp32-firmware` o `device-simulator` -> `MQTT` -> `backend` -> `database` -> `web-dashboard`.

Nota decisionale: il database e' la source of truth per lo stato operativo; il simulator non deve contenere logica di business separata da quella del device reale.

## Stack Proposto
- `ESP-IDF` per il firmware ESP32.
- `TypeScript` come linguaggio principale per backend, simulator e dashboard.
- `Node.js` per il backend monolitico modulare e per `device-simulator`.
- `Fastify` per l'API HTTP del backend.
- `MQTT` per la comunicazione device/backend.
- `PostgreSQL` con `Prisma` per il database.
- `React` + `Vite` per la dashboard.
- `Redux Toolkit` per lo store centrale osservabile della dashboard.
- `WebSocket` per il realtime dashboard.
- `Zod` per validazione dei payload.
- `Vitest` per test unitari e di integrazione.
- `Playwright` per i test end-to-end iniziali.
- `Docker Compose` per ambiente locale ripetibile.

Nota decisionale: partire con uno stack principalmente in `TypeScript` riduce il costo cognitivo e rende piu' semplice l'uso di Codex su piu' componenti, lasciando `ESP-IDF` come tecnologia dedicata all'hardware reale.

## Struttura del Repository
- `apps/api`
- `apps/device-simulator`
- `apps/web-dashboard`
- `apps/esp32-firmware`
- `packages/shared`
- `packages/config`
- `prisma`
- `docs`

Nota decisionale: `packages/shared` deve contenere solo contratti e utility davvero comuni; niente logica applicativa duplicata.

## Roadmap a Fasi
1. Setup repository: workspace, lint, formatting, test runner, CI base, `AGENTS.md`, `PLAN.md`, template PR. PR singola, solo scaffolding.
2. Architettura tecnica e contratti: protocollo `MQTT`, conferme comando, flusso realtime dashboard, modello `event log + projection`.
3. Skeleton applicativi: backend, simulator, dashboard e firmware ESP32. PR singole per ciascuno o per un blocco minimo coerente.
4. Persistenza e ingestione: schema dati, connessione a `PostgreSQL`, ingestione telemetria e notifiche, proiezioni di stato corrente.
5. Dashboard realtime e comandi confermati: bootstrap `snapshot + stream`, stato centralizzato, comandi `pending -> confirmed/failed`, nessuna optimistic UI.
6. Hardening: test end-to-end, logging, error handling, seed dati, verifica con simulator e firmware reale. PR piccole, una preoccupazione per volta.

## Stato Corrente
- `main` contiene gia':
  - planning architetturale e contratti di messaggio
  - backend foundation verificata
  - primo slice `MQTT` del backend con broker embedded e ingestione in-memory
  - schema iniziale `Prisma` e wiring del client database nel backend
  - persistenza dei messaggi device inbound da `MQTT` verso `PostgreSQL`
  - integrazione del broker `MQTT` con scrittura verso database e aggiornamento dello stato in-memory
  - query backend lette dalla proiezione persistita invece che solo dallo store in-memory
  - prime route DB-backed per `GET /devices`, `GET /devices/:deviceMac/state`, `GET /devices/:deviceMac/telemetry`, `GET /notifications`
- prossimo task previsto:
  - completare il ciclo dei comandi persistiti e delle conferme `pending -> confirmed/failed`
  - introdurre endpoint backend per `command` e `config`
  - pubblicare i comandi verso il device via `MQTT` solo dopo persistenza del record `pending`

## Primo Set di Milestone
- Milestone 1: definire workspace, lint, formatting, test runner, CI base e template PR; accettazione: il repository ha una struttura ripetibile, i file di governance sono presenti, e il setup e' descritto in modo chiaro; verifica: `git diff --check`, `git status --short`, comando di validazione del workspace quando introdotto; stop-and-fix: se una verifica fallisce, interrompere la milestone e correggere prima di aggiungere altro; nota decisionale: niente codice applicativo in questa PR.
- Milestone 2: formalizzare architettura e contratti di messaggio; accettazione: protocollo `MQTT`, conferme comando e bootstrap dashboard sono documentati in modo coerente; verifica: review documentale e controllo di allineamento tra `PLAN.md` e `plan/`; stop-and-fix: se emergono conflitti tra documenti, correggere prima di introdurre codice; nota decisionale: nessun dettaglio implementativo inutile in questa milestone.
- Milestone 3: creare gli skeleton di `api`, `device-simulator`, `web-dashboard` e firmware ESP32; accettazione: gli entrypoint esistono ma non contengono feature business; verifica: avvio locale dei package software, pagina placeholder o health check, build minima firmware o validazione del toolchain; stop-and-fix: se un package non parte o manca un entrypoint, fissare prima la struttura; nota decisionale: preferire placeholder minimi e stabili.
- Milestone 4: definire lo schema iniziale in `Prisma`; accettazione: modelli base per device, telemetria, notifiche, comandi e proiezioni sono chiari e versionati; verifica: `prisma validate`, migrazione generata, controllo che il client venga compilato; stop-and-fix: se lo schema e' ambiguo, bloccare e semplificare prima di proseguire; nota decisionale: modellare solo i dati necessari al primo flusso end-to-end.
- Milestone 5: produrre un primo flusso simulato end-to-end; accettazione: `device-simulator` invia un evento, il backend lo riceve via `MQTT`, il `database` lo persiste e la dashboard mostra il dato via `WebSocket`; verifica: `Vitest`, `Playwright` per il percorso base, controllo manuale dei dati nel database; stop-and-fix: se uno dei passaggi del flusso fallisce, non aggiungere feature e ripristinare il percorso minimo funzionante.
- Stato milestone 5:
  - ingestione `MQTT` verso backend gia' presente
  - persistenza dei messaggi inbound e aggiornamento della proiezione persistita completati e mergiati su `main`
  - letture backend dal database e allineamento delle route di stato corrente completati e mergiati su `main`
  - prossimo step operativo: completare il percorso dei comandi confermati sopra la base persistita
- Milestone 6: aggiungere il primo flusso di comando confermato; accettazione: il comando viene salvato come `pending`, il device conferma, il backend aggiorna lo stato e la dashboard mostra il cambiamento solo dopo conferma; verifica: test `Vitest`, richiesta manuale, verifica esplicita di assenza optimistic UI; stop-and-fix: se il backend aggiorna la UI prima della conferma reale, correggere prima di proseguire.

## Strategia di Verifica
- ogni PR deve includere il comando eseguito e il risultato atteso
- preferire test piccoli e mirati: `Vitest` prima, `Playwright` quando il flusso lo richiede
- bloccare merge senza verifica locale o senza spiegazione del gap
- mantenere PR piccole e limitate a una sola decisione tecnica
- se una verifica fallisce, fermarsi, correggere, rieseguire e solo dopo continuare

## Rischi e Limiti di Scope
- rischio di espandere troppo presto la UI o le feature
- rischio di introdurre stack troppo complesso prima dello skeleton
- rischio di fare refactor grandi senza una base verificata

Limiti di scope:
- niente funzionalita' business avanzate nella fase iniziale
- niente ottimizzazioni premature
- niente implementazioni duplicate tra firmware, simulator, API e dashboard
- ogni passo deve essere adatto a una PR piccola e reviewable
- ogni nuova idea fuori piano va registrata come follow-up, non infilata nella PR corrente
