# Vision

## Scopo
Definire in modo chiaro che cosa dovra' diventare FleetLab una volta completato il sistema, a livello di prodotto e comportamento generale, senza entrare ancora nel dettaglio implementativo.

## Product Summary
FleetLab e' un progetto personale di sperimentazione per esplorare le potenzialita' di schede ESP32 collegate a un server centrale e osservabili da una dashboard remota.

Non e' un prodotto commerciale. E' un sistema giocattolo ma reale, pensato per provare monitoraggio, controllo remoto, storico dati e interazione bidirezionale tra dispositivi e server.

## Main Goal
Il sistema deve permettere di collegare un numero variabile di schede ESP32 che:
- inviano periodicamente temperatura e umidita'
- possono inviare notifiche generiche verso l'utente
- possono essere controllate a distanza per gestire il LED RGB
- possono ricevere dal server una configurazione di polling specifica

L'utente deve poter osservare lo stato delle schede, leggere i dati live e storici, ricevere notifiche pendenti e inviare comandi verso ogni dispositivo con tracciamento completo.

## Primary User
L'utente e' il proprietario del sistema, in un contesto personale di test.

Il prodotto e' pensato per un solo amministratore operativo, senza multiutenza e senza ruoli distinti.

## Core Product Behaviors
- Le schede sono scoperte a runtime: il server non conosce in anticipo quante ESP esistono.
- Ogni scheda e' identificata in modo stabile dal MAC address.
- Quando una nuova scheda si collega, viene registrata automaticamente senza flussi di approvazione, pairing o whitelist.
- Ogni scheda puo' avere un nome utente modificabile.
- Ogni scheda puo' avere un colore associato, usato per identificarla nei grafici.
- La comunicazione tra server e scheda e' bidirezionale.
- Ogni messaggio scambiato con la scheda deve avere un timestamp.
- Le schede inviano telemetria periodica di temperatura e umidita'.
- Le schede possono inviare notifiche semplici verso l'utente senza semantica tecnica forte.
- Le notifiche devono essere persistite e restare visibili finche' l'utente non le conferma.
- Se l'utente non e' online quando arriva una notifica, il server la conserva e la mostra quando l'utente torna sulla dashboard.
- L'utente puo' comandare il LED RGB di ogni scheda: accensione, spegnimento, colore e luminosita'.
- L'utente puo' impostare per ogni scheda una frequenza di polling persistente.
- Se una scheda e' offline, i comandi vengono rifiutati subito e non restano in coda.

## Dashboard Experience
La dashboard deve avere una pagina principale e una pagina di dettaglio per ogni scheda.

Nella pagina principale l'utente deve poter:
- vedere un grafico interattivo dei dati
- scegliere quale parametro osservare
- scegliere la finestra temporale
- selezionare quali schede includere
- scegliere se visualizzare serie singole o viste mediate
- vedere una card per ogni scheda con stato e dati correnti
- vedere badge, popup e centro notifiche per gli eventi ricevuti dalle schede

Nella pagina di dettaglio di una singola scheda l'utente deve poter:
- vedere il nome modificabile della scheda
- vedere quando la scheda ha fatto la prima connessione
- vedere quando e' arrivato l'ultimo messaggio
- vedere i grafici della sua temperatura e umidita'
- controllare il LED RGB
- impostare metadati utente come nome e colore identificativo

## History And Traceability
Il sistema deve conservare storico completo di:
- telemetria delle schede
- notifiche inviate dalle schede
- comandi inviati dall'utente verso le schede

Per i comandi l'obiettivo e' avere un log consultabile con timestamp e contenuto dell'azione richiesta, per esempio accensione del LED, colore impostato o livello di luminosita'.

## Explicit Scope Decisions
- Accesso remoto ammesso.
- Nessun login o autenticazione nella scope attuale del prodotto.
- Nessun workflow di approvazione per nuove schede.
- Nessuna semantica avanzata delle notifiche: sono eventi generici device-to-user.
- Lo storico e' considerato completo finche' non verra' definita una retention diversa.

## Non-Goals
- prodotto commerciale o multiutente
- gestione complessa di ruoli e permessi
- onboarding manuale delle nuove schede
- sistema di alerting semantico o motore di regole avanzato
