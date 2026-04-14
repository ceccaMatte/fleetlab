# Requirements

## Scopo
Raccogliere i requisiti funzionali e operativi che guidano API, modello dati, firmware ESP32, simulator e dashboard.

## Requisiti Funzionali

### Device Discovery E Identita'
- Il sistema deve accettare un numero variabile di device senza configurazione preventiva.
- Ogni device deve essere identificato in modo stabile dal MAC address.
- Un nuovo device deve essere registrato automaticamente quando si collega per la prima volta.
- Ogni device puo' avere nome utente e colore associato modificabili dalla dashboard.

### Telemetria
- Ogni device deve inviare temperatura e umidita' a intervalli configurabili.
- Il backend deve validare e persistere ogni messaggio ricevuto.
- La dashboard deve mostrare stato corrente e storico dei dati.
- La dashboard deve permettere selezione di metrica, finestra temporale e insieme di device da visualizzare.

### Notifiche
- Ogni device puo' inviare notifiche generiche verso l'utente.
- Le notifiche devono essere persistite.
- Le notifiche devono restare visibili finche' non vengono confermate dall'utente.
- Se l'utente non e' online, le notifiche devono essere mostrate al successivo accesso.

### Comandi Remoti
- L'utente deve poter controllare il LED RGB di ogni device.
- I comandi supportati devono includere almeno accensione, spegnimento, colore e luminosita'.
- L'utente deve poter impostare una frequenza di polling persistente per ogni device.
- Se un device e' offline, il backend deve rifiutare il comando subito senza accodarlo.
- Ogni comando deve essere tracciato con almeno stato `pending`, `confirmed` o `failed`.
- La dashboard deve riflettere il nuovo stato solo dopo conferma certa del device.

### Storico E Tracciabilita'
- Il sistema deve conservare storico completo di telemetria, notifiche e comandi.
- Ogni messaggio scambiato deve avere un timestamp.
- I comandi devono essere consultabili con contenuto richiesto ed esito finale.

## Requisiti Di Esperienza Dashboard
- La dashboard deve essere una web app responsive progettata mobile-first.
- La dashboard deve rimanere leggibile e usabile anche da desktop.
- La pagina principale deve mostrare:
  - card di stato dei device
  - grafici interattivi
  - selezione delle serie da includere
  - badge e centro notifiche
- La pagina di dettaglio deve mostrare:
  - nome modificabile del device
  - prima connessione
  - ultimo messaggio ricevuto
  - grafici del singolo device
  - controlli LED
  - metadati utente
- La dashboard deve usare uno store centrale osservabile aggiornato da eventi realtime.
- Il bootstrap della UI deve seguire il modello `snapshot + stream`.
- Non deve esserci optimistic UI sui comandi che modificano lo stato del device.

## Requisiti Operativi E Tecnici
- Il backend deve essere un monolite modulare con confini interni espliciti.
- Il backend deve usare `Node.js` e `TypeScript`.
- Il database deve essere `PostgreSQL`.
- La comunicazione device/backend deve essere `MQTT-first`.
- I topic `MQTT` e i payload V1 devono essere documentati e condivisi tra firmware, simulator e backend.
- I messaggi base V1 devono includere almeno `hello`, `heartbeat`, `telemetry`, `notification`, `ack`, `command` e `config`.
- La comunicazione backend/dashboard deve usare API HTTP e `WebSocket`.
- Il firmware reale deve essere sviluppato con `ESP-IDF`.
- Deve esistere un `device-simulator` compatibile con il protocollo del firmware reale.

## Vincoli Di Processo
- Le decisioni architetturali devono essere esplicite e versionate nei documenti.
- Il lavoro iniziale deve rimanere coerente con milestone piccole e reviewable.
- Il setup repository resta separato dall'implementazione delle feature di prodotto.

## Casi Limite Da Supportare
- device offline al momento dell'invio comando
- dashboard aperta dopo l'arrivo di notifiche non confermate
- riconnessione di un device gia' noto
- dati realtime ricevuti mentre la dashboard e' gia' aperta
- comandi e config in stato `pending` prima dell'`ack`

## Assunzioni Correnti
- Nessuna autenticazione o multiutenza nella scope attuale.
- Nessun workflow di approvazione o whitelist per nuovi device.
- Nessuna semantica avanzata delle notifiche.
- Nessuna retention limit definita al momento.
