# FleetLab Project Plan

## Obiettivo del progetto
FleetLab è un progetto di apprendimento per usare Codex come agent di sviluppo principale in modo disciplinato. L’obiettivo è costruire un prodotto reale, ma partire da una base controllata: `device-simulator`, backend API, database e web dashboard.

Nota decisionale: in questa fase il focus è imparare un flusso di lavoro solido, non massimizzare la feature surface.

## Architettura di Alto Livello
- `device-simulator` genera telemetria e stati dei dispositivi.
- `api` riceve eventi, valida i dati, espone endpoint per dashboard e automazione.
- `database` persiste dispositivi, eventi, metriche e configurazione.
- `web-dashboard` mostra stato, trend e dettagli operativi.

Il flusso principale è: `device-simulator` -> `api` -> `database` -> `web-dashboard`.

Nota decisionale: il database è la source of truth per lo stato operativo; il simulator non deve contenere logica di business persistente.

## Stack Proposto
- `TypeScript` come linguaggio comune.
- `Node.js` per `api` e `device-simulator`.
- `Fastify` per l’API.
- `PostgreSQL` con `Prisma` per il database.
- `React` + `Vite` per la dashboard.
- `Zod` per validazione dei payload.
- `Vitest` per test unitari e di integrazione.
- `Playwright` per i test end-to-end iniziali.
- `Docker Compose` per ambiente locale ripetibile.

Nota decisionale: partire con uno stack unico in `TypeScript` riduce il costo cognitivo e rende più semplice l’uso di Codex su più componenti.

## Struttura del Repository
- `apps/api`
- `apps/device-simulator`
- `apps/web-dashboard`
- `packages/shared`
- `packages/config`
- `prisma`
- `docs`

Nota decisionale: `packages/shared` deve contenere solo contratti e utility davvero comuni; niente logica applicativa duplicata.

## Roadmap a Fasi
1. Setup repository: workspace, lint, formatting, test runner, CI base, `AGENTS.md`, `PLAN.md`, template PR. PR singola, solo scaffolding.
2. Base backend: schema dati, connessione a `PostgreSQL`, health check, ingestione telemetria minima. PR singola per ogni blocco.
3. Simulator: generazione dati realistica, configurazione device, invio eventi all’API. PR separate per generatore e client.
4. Dashboard: lista device, dettaglio stato, timeline eventi, metriche base. PR separate per lista, dettaglio e grafici.
5. Hardening: test end-to-end, logging, error handling, seed dati, pulizia API. PR piccole, una preoccupazione per volta.

## Primo Set di Milestone
- Milestone 1: definire workspace, lint, formatting, test runner, CI base e template PR; accettazione: il repository ha una struttura ripetibile, i file di governance sono presenti, e il setup è descritto in modo chiaro; verifica: `git diff --check`, `git status --short`, comando di validazione del workspace quando introdotto; stop-and-fix: se una verifica fallisce, interrompere la milestone e correggere prima di aggiungere altro; nota decisionale: niente codice applicativo in questa PR.
- Milestone 2: creare gli skeleton di `api`, `device-simulator` e `web-dashboard`; accettazione: gli entrypoint esistono ma non contengono feature business; verifica: avvio locale dei tre package, controllo che ogni app risponda con un health check o una pagina placeholder, `git diff --check`; stop-and-fix: se un app non parte o manca un entrypoint, fissare prima la struttura; nota decisionale: preferire placeholder minimi e stabili.
- Milestone 3: definire lo schema iniziale in `Prisma`; accettazione: modelli base per device, event e metric sono chiari e versionati; verifica: `prisma validate`, migrazione generata, controllo che il client venga compilato; stop-and-fix: se lo schema è ambiguo, bloccare e semplificare prima di proseguire; nota decisionale: modellare solo i dati necessari al primo flusso end-to-end.
- Milestone 4: aggiungere endpoint `health` e primo endpoint di ingestione; accettazione: l’API risponde correttamente e valida il payload con `Zod`; verifica: test `Vitest`, richiesta manuale con `curl` o equivalente, controllo log/error handling; stop-and-fix: se la validazione o la persistenza falliscono, correggere prima della dashboard; nota decisionale: non introdurre autenticazione o code path secondarie in questa fase.
- Milestone 5: produrre un primo flusso simulato end-to-end; accettazione: `device-simulator` invia un evento, `api` lo riceve, `database` lo persiste e la dashboard mostra il dato; verifica: `Vitest`, `Playwright` per il percorso base, controllo manuale dei dati nel database; stop-and-fix: se uno dei passaggi del flusso fallisce, non aggiungere feature e ripristinare il percorso minimo funzionante.

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
- niente funzionalità business avanzate nella fase iniziale
- niente ottimizzazioni premature
- niente implementazioni duplicate tra simulator, API e dashboard
- ogni passo deve essere adatto a una PR piccola e reviewable
- ogni nuova idea fuori piano va registrata come follow-up, non infilata nella PR corrente
