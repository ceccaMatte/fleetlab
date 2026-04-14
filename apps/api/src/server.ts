import { buildApp, createAppServices } from "./app.ts";
import { loadEnv } from "./config/env.ts";
import { createMqttBroker } from "./modules/mqtt/mqtt-broker.ts";

const env = loadEnv();
const services = createAppServices();
const app = buildApp(services);
const mqttBroker = createMqttBroker({
  deviceStateStore: services.deviceStateStore
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
