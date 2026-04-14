# Architecture

## Scopo
Descrivere la struttura ad alto livello del sistema FleetLab, i confini tra i componenti e il flusso dei dati tra device, backend, database e dashboard.

## Decisioni Architetturali Principali
- Backend monolitico modulare.
- `Node.js` + `TypeScript` per il backend.
- `PostgreSQL` come source of truth.
- `MQTT` come canale principale tra device e backend.
- `WebSocket` come canale realtime tra backend e dashboard.
- Dashboard web mobile-first con `React`, `Vite` e `TypeScript`.
- Store centrale osservabile nella dashboard con `Redux Toolkit`.
- Nessuna optimistic UI: la UI mostra uno stato cambiato solo dopo conferma certa dal backend o dal device.

## Componenti Del Sistema

### ESP32 Firmware
- Implementato con `ESP-IDF`.
- Organizzato per componenti di dominio invece che per task generici.
- Responsabilita' principali:
  - connessione di rete
  - client `MQTT`
  - raccolta telemetria
  - invio notifiche device-to-user
  - ricezione ed esecuzione comandi remoti
  - applicazione configurazione polling
- Ogni scheda e' identificata stabilmente dal MAC address.

### Device Simulator
- E' un emulatore software di un device reale.
- Deve parlare gli stessi topic e gli stessi messaggi usati dal firmware ESP32.
- Serve a testare il flusso end-to-end senza dipendere sempre dall'hardware fisico.

### Backend
- E' un unico processo deployabile, ma diviso in moduli interni con responsabilita' esplicite.
- Moduli previsti:
  - registry dei device
  - ingestione telemetria
  - gestione notifiche
  - gestione comandi
  - proiezioni di stato corrente
  - API HTTP per la dashboard
  - gateway realtime `WebSocket`
  - integrazione `MQTT`
- Il backend gestisce sia lo stato storico sia la vista corrente del sistema.

### Database
- `PostgreSQL` conserva i dati persistenti del sistema.
- Il modello dati segue una forma `event log + projection`.
- Le tabelle storiche devono conservare:
  - telemetria
  - notifiche
  - comandi utente
  - conferme o fallimenti dei comandi
- Le proiezioni servono per leggere rapidamente:
  - stato online o offline
  - ultimo dato noto
  - configurazione attiva
  - ultimo stato confermato del LED

### Dashboard Web
- Web app responsive, progettata mobile-first ma leggibile bene anche da desktop.
- Usa uno store centrale osservabile.
- Le pagine leggono lo stato tramite listener e aggiornamenti provenienti dallo store.
- Caricamento iniziale con `snapshot + stream`:
  - snapshot iniziale via API HTTP
  - aggiornamenti successivi via `WebSocket`

## Flussi Principali

### Telemetria
1. Il device o il simulator pubblica un messaggio `MQTT`.
2. Il backend valida il messaggio e lo persiste nel log eventi.
3. Il backend aggiorna le proiezioni di stato corrente.
4. Il backend notifica la dashboard via `WebSocket`.
5. Lo store centrale aggiorna le viste interessate.

### Notifiche
1. Il device pubblica una notifica generica via `MQTT`.
2. Il backend la salva in modo persistente.
3. La notifica resta visibile finche' l'utente non la conferma.
4. La dashboard riceve l'evento realtime e aggiorna badge, popup e centro notifiche.

### Comandi
1. L'utente invia un comando dalla dashboard verso il backend via HTTP.
2. Il backend verifica che il device sia online.
3. Se il device e' offline, il comando viene rifiutato subito e non entra in coda.
4. Se il device e' online, il backend salva il comando come `pending`.
5. Il backend pubblica il comando sul canale `MQTT`.
6. Il device esegue il comando e invia una conferma o un fallimento.
7. Il backend aggiorna il record del comando come `confirmed` o `failed`.
8. Solo dopo questo passaggio la dashboard mostra il nuovo stato effettivo.

## Confini E Responsabilita'
- Il firmware non e' source of truth dello stato operativo globale.
- Il simulator non contiene logica di business diversa da quella prevista per un device reale.
- Il backend centralizza validazione, persistenza, storico e distribuzione realtime.
- La dashboard non deve inventare stato locale ottimistico per i comandi critici.

## Dipendenze Infrastrutturali
- Backend applicativo `Node.js`
- Database `PostgreSQL`
- Broker `MQTT` integrato nello stesso backend monolitico
- Dashboard web servita come applicazione frontend separata nel workspace

## Assunzioni Correnti
- Nessuna autenticazione nella scope attuale.
- Nessuna approvazione manuale per nuovi device.
- Storico considerato completo finche' non verra' definita una retention.
- Il primo protocollo device/backend sara' definito attorno a `MQTT` e non a polling HTTP.
