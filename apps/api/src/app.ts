import Fastify from "fastify";

import { DeviceStateStore } from "./modules/devices/device-state-store.ts";
import { registerDeviceRoutes } from "./modules/devices/device-routes.ts";
import { registerHealthRoutes } from "./modules/health/health-routes.ts";

export interface AppServices {
  deviceStateStore: DeviceStateStore;
}

export function createAppServices(): AppServices {
  return {
    deviceStateStore: new DeviceStateStore()
  };
}

export function buildApp(services: AppServices = createAppServices()) {
  const app = Fastify({
    logger: false
  });

  app.register(registerHealthRoutes);
  app.register((instance) => registerDeviceRoutes(instance, services.deviceStateStore));

  return app;
}
