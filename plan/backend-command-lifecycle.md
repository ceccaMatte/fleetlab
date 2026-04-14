# Backend Command Lifecycle

## Objective
Implementare il primo lifecycle completo dei comandi backend:
- ricezione richiesta HTTP
- verifica device online
- persistenza del record come `pending`
- publish su `MQTT`
- finalizzazione su `ack` come `confirmed` o `failed`

La fase copre sia `command` sia `config`, mantenendoli separati nel protocollo ma coerenti nello stesso flusso applicativo.

## Ordered Tasks
1. [x] **Persistence layer for command lifecycle**
   - introdurre un service backend per creare record `pending` di `command` e `config`
   - aggiornare la persistenza degli `ack` per finalizzare il relativo record `DeviceCommand`
   - aggiungere query persistite per ispezionare i comandi registrati

2. [x] **MQTT outbound publishing**
   - estendere il broker embedded con la capacita' di pubblicare messaggi outbound verso i topic `command` e `config`
   - introdurre un service applicativo che persista prima il record `pending` e poi pubblichi il messaggio su `MQTT`
   - registrare `publishedAt` solo dopo publish riuscito

3. [x] **HTTP routes for command and config**
   - aggiungere route HTTP per inviare `command` e `config`
   - rifiutare subito la richiesta se il device risulta offline
   - restituire al client il record persistito con stato `pending`
   - aggiungere `GET /commands` per bootstrap lato dashboard

4. [ ] **Verification and regression checks**
   - coprire persistence layer, publish path, ACK finalization e route HTTP con test mirati
   - rieseguire `validate`, typecheck e suite API completa

## Dependencies
- Il task 1 sblocca il task 2 perche' serve la persistenza prima del publish.
- Il task 2 sblocca il task 3 perche' le route devono orchestrare persistenza e publish insieme.
- Il task 4 dipende da tutti i task precedenti.

## Completion Criteria
- Un device online puo' ricevere un `command` via HTTP, il backend salva il record `pending`, pubblica il messaggio `MQTT` e registra `publishedAt`.
- Un device offline riceve risposta di rifiuto e nessun record viene pubblicato su `MQTT`.
- Quando arriva un `ack`, il backend aggiorna il record del comando a `confirmed` o `failed`.
- `GET /commands` espone il read model persistito dei comandi.
- Tutti i test introdotti nella fase risultano verdi insieme alla suite API esistente.

## Risks And Ambiguities
- Il protocollo documentato non definisce ancora endpoint HTTP pubblici per `command` e `config`; in questa fase useremo route backend aderenti alla struttura del dominio:
  - `POST /devices/:deviceMac/commands`
  - `POST /devices/:deviceMac/config`
- Il broker embedded oggi gestisce principalmente traffico inbound; l'outbound va aggiunto senza rompere il flusso di ingestione esistente.
- La determinazione `online/offline` usera' il read model persistito, non lo store in-memory, per mantenere il backend coerente con la source of truth.
