# Message Contracts

## Scopo
Definire la specifica V1 dei messaggi scambiati tra device, simulator, backend e dashboard, con particolare attenzione a topic `MQTT`, payload minimi e ciclo di vita dei comandi.

## Principi V1
- Il protocollo esterno identifica i device tramite `device_mac`.
- Ogni messaggio device -> backend deve includere `schema_version`, `message_id`, `device_mac` e `sent_at`.
- La dashboard non usa optimistic UI per gli aggiornamenti di stato dei device.
- I comandi vengono salvati come `pending` e passano a `confirmed` o `failed` solo dopo `ack`.
- La UI puo' mostrare esplicitamente uno stato `pending` finche' il device non conferma.
- `config` resta separato da `command`, ma segue lo stesso lifecycle di richiesta, `pending`, `ack` e stato confermato.

## Identita' E Sessione
- Ogni device e' identificato in modo stabile dal MAC address.
- Il backend puo' assegnare un `device_id` interno persistente, ma il protocollo esterno usa il MAC.
- Un device e' considerato `online` quando:
  - ha una sessione `MQTT` attiva
  - e ha inviato almeno un messaggio recente entro la finestra di presenza definita dal backend
- Se la sessione cade o la finestra scade, il device passa a `offline`.

## Topic MQTT V1

### Device -> Backend
- `fleetlab/devices/{mac}/hello`
- `fleetlab/devices/{mac}/telemetry`
- `fleetlab/devices/{mac}/notification`
- `fleetlab/devices/{mac}/ack`
- `fleetlab/devices/{mac}/heartbeat`

### Backend -> Device
- `fleetlab/devices/{mac}/command`
- `fleetlab/devices/{mac}/config`

### Presence
- `fleetlab/devices/{mac}/status`

Valori ammessi per `status`:
- `online`
- `offline`

## Envelope Comune

### Device -> Backend
```json
{
  "schema_version": 1,
  "message_id": "uuid",
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "sent_at": "2026-04-14T16:30:00Z"
}
```

## Payload V1

### Hello
```json
{
  "schema_version": 1,
  "message_id": "uuid",
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "sent_at": "2026-04-14T16:30:00Z",
  "firmware_version": "0.1.0",
  "capabilities": {
    "temperature": true,
    "humidity": true,
    "rgb_led": true,
    "notifications": true,
    "polling_config": true
  }
}
```

### Telemetry
```json
{
  "schema_version": 1,
  "message_id": "uuid",
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "sent_at": "2026-04-14T16:30:00Z",
  "temperature_c": 22.4,
  "humidity_pct": 48.2
}
```

### Notification
```json
{
  "schema_version": 1,
  "message_id": "uuid",
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "sent_at": "2026-04-14T16:30:00Z",
  "kind": "generic",
  "message": "Water tank low"
}
```

### Heartbeat
```json
{
  "schema_version": 1,
  "message_id": "uuid",
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "sent_at": "2026-04-14T16:30:00Z",
  "uptime_ms": 123456,
  "wifi_rssi": -61
}
```

### Command
```json
{
  "schema_version": 1,
  "command_id": "uuid",
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "issued_at": "2026-04-14T16:30:00Z",
  "type": "led.set",
  "payload": {
    "power": true,
    "color_rgb": { "r": 255, "g": 120, "b": 0 },
    "brightness": 80
  }
}
```

### Config
```json
{
  "schema_version": 1,
  "config_id": "uuid",
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "issued_at": "2026-04-14T16:30:00Z",
  "polling_interval_sec": 30
}
```

### Ack
```json
{
  "schema_version": 1,
  "message_id": "uuid",
  "device_mac": "AA:BB:CC:DD:EE:FF",
  "sent_at": "2026-04-14T16:30:02Z",
  "target_type": "command",
  "target_id": "uuid",
  "status": "confirmed",
  "result": {
    "applied_state": {
      "power": true,
      "color_rgb": { "r": 255, "g": 120, "b": 0 },
      "brightness": 80
    }
  }
}
```

Valori ammessi per `ack.status`:
- `confirmed`
- `failed`

Valori ammessi per `ack.target_type`:
- `command`
- `config`

## Lifecycle Dei Comandi
1. La dashboard invia un comando HTTP al backend.
2. Il backend controlla se il device e' `online`.
3. Se il device e' `offline`, il comando viene rifiutato subito.
4. Se il device e' `online`, il backend salva il record come `pending`.
5. Il backend pubblica il messaggio sul topic `command` oppure `config`.
6. Il device applica la richiesta e invia `ack`.
7. Il backend aggiorna il record come `confirmed` o `failed`.
8. Solo dopo l'`ack` il backend aggiorna lo stato confermato del device e propaga il cambiamento definitivo alla dashboard.

## Regole UI
- La dashboard puo' mostrare che un comando o una config sono `pending`.
- La dashboard non deve mostrare lo stato finale applicato prima dell'`ack`.
- Il valore mostrato per LED e polling deve rappresentare solo l'ultimo stato confermato.

## Snapshot E Stream Dashboard

### Bootstrap HTTP
- `GET /devices`
- `GET /devices/:id`
- `GET /devices/:id/telemetry`
- `GET /notifications`
- `GET /commands`

### Eventi Realtime WebSocket
- `device.registered`
- `device.status_changed`
- `telemetry.received`
- `notification.created`
- `notification.acknowledged`
- `command.updated`
- `device.config_updated`

## Modello Dati Minimo Impattato
- `devices`
- `telemetry_events`
- `device_notifications`
- `device_commands`
- `device_command_acks`
- `device_state_projection`

`device_state_projection` deve includere almeno:
- stato online o offline
- ultimo contatto
- ultimo valore temperatura
- ultimo valore umidita'
- nome utente
- colore utente
- polling interval confermato
- ultimo stato LED confermato

## Scelte Intenzionali Di V1
- Nessuna QoS o retry policy sofisticata nel contratto funzionale.
- Nessun batching di telemetria.
- Nessuna coda di comandi per device offline.
- Nessuna autenticazione device.
- Nessuna semantica avanzata delle notifiche.
