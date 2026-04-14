const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_PORT = 3000;
const DEFAULT_MQTT_HOST = "0.0.0.0";
const DEFAULT_MQTT_PORT = 18830;
const DEFAULT_DATABASE_URL = "postgresql://fleetlab:fleetlab@127.0.0.1:5432/fleetlab?schema=public";

export interface ApiEnv {
  host: string;
  port: number;
  mqttHost: string;
  mqttPort: number;
  databaseUrl: string;
}

function parsePositivePort(value: string, key: string) {
  const port = Number.parseInt(value, 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid ${key} value: ${value}`);
  }

  return port;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  const host = source.API_HOST ?? DEFAULT_HOST;
  const rawPort = source.API_PORT ?? `${DEFAULT_PORT}`;
  const mqttHost = source.MQTT_HOST ?? DEFAULT_MQTT_HOST;
  const rawMqttPort = source.MQTT_PORT ?? `${DEFAULT_MQTT_PORT}`;
  const databaseUrl = source.DATABASE_URL ?? DEFAULT_DATABASE_URL;

  return {
    host,
    port: parsePositivePort(rawPort, "API_PORT"),
    mqttHost,
    mqttPort: parsePositivePort(rawMqttPort, "MQTT_PORT"),
    databaseUrl
  };
}
