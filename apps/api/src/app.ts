import Fastify from "fastify";

import type { ApiEnv } from "./config/env.ts";
import { DeviceStateStore } from "./modules/devices/device-state-store.ts";
import { registerDeviceRoutes } from "./modules/devices/device-routes.ts";
import { registerHealthRoutes } from "./modules/health/health-routes.ts";
import { createPrismaClient, type DatabaseClient, type DatabaseClientFactory } from "./modules/database/prisma-client.ts";

export interface AppServices {
  deviceStateStore: DeviceStateStore;
  databaseClient: DatabaseClient;
}

export interface AppServiceDependencies {
  createDatabaseClient?: DatabaseClientFactory;
}

export function createAppServices(
  env: ApiEnv,
  dependencies: AppServiceDependencies = {}
): AppServices {
  const createDatabaseClient = dependencies.createDatabaseClient ?? createPrismaClient;

  return {
    deviceStateStore: new DeviceStateStore(),
    databaseClient: createDatabaseClient({
      databaseUrl: env.databaseUrl
    })
  };
}

export function buildApp(services: AppServices) {
  const app = Fastify({
    logger: false
  });

  app.addHook("onClose", async () => {
    await services.databaseClient.$disconnect();
  });

  app.register(registerHealthRoutes);
  app.register((instance) => registerDeviceRoutes(instance, services.deviceStateStore));

  return app;
}
