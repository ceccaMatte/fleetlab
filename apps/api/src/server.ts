import { buildApp, createAppServices } from "./app.ts";
import { loadEnv } from "./config/env.ts";
import { createDeviceCommandDispatchService } from "./modules/commands/device-command-dispatch-service.ts";
import {
  createDevicePersistenceService,
  type DevicePersistenceDatabaseClient
} from "./modules/database/device-persistence.ts";
import { createMqttBroker } from "./modules/mqtt/mqtt-broker.ts";

const env = loadEnv();
const services = createAppServices(env);
const devicePersistenceService = createDevicePersistenceService(
  services.databaseClient as DevicePersistenceDatabaseClient
);
const mqttBroker = createMqttBroker({
  deviceStateStore: services.deviceStateStore,
  devicePersistenceService,
  onPersistenceError: (error) => {
    console.error(error);
  }
});
const deviceCommandDispatchService = createDeviceCommandDispatchService(
  services.deviceCommandService,
  mqttBroker
);
const app = buildApp({
  ...services,
  deviceCommandDispatchService
});

try {
  await mqttBroker.start({
    host: env.mqttHost,
    port: env.mqttPort
  });

  app.addHook("onClose", async () => {
    await mqttBroker.close();
  });

  await app.listen({
    host: env.host,
    port: env.port
  });
} catch (error) {
  await mqttBroker.close();
  app.log.error(error);
  process.exit(1);
}
