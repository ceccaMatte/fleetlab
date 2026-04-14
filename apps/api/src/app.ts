import Fastify from "fastify";

import type { ApiEnv } from "./config/env.ts";
import {
  createDeviceQueryService,
  type DeviceQueryDatabaseClient,
  type DeviceQueryService
} from "./modules/database/device-query-service.ts";
import { DeviceStateStore } from "./modules/devices/device-state-store.ts";
import { registerDeviceRoutes } from "./modules/devices/device-routes.ts";
import { registerHealthRoutes } from "./modules/health/health-routes.ts";
import { registerNotificationRoutes } from "./modules/notifications/notification-routes.ts";
import { createPrismaClient, type DatabaseClient, type DatabaseClientFactory } from "./modules/database/prisma-client.ts";

export interface AppServices {
  deviceStateStore: DeviceStateStore;
  databaseClient: DatabaseClient;
  deviceQueryService: DeviceQueryService;
}

export interface AppServiceDependencies {
  createDatabaseClient?: DatabaseClientFactory;
  createDeviceQueryService?: (databaseClient: DeviceQueryDatabaseClient) => DeviceQueryService;
}

export function createAppServices(
  env: ApiEnv,
  dependencies: AppServiceDependencies = {}
): AppServices {
  const createDatabaseClient = dependencies.createDatabaseClient ?? createPrismaClient;
  const databaseClient = createDatabaseClient({
    databaseUrl: env.databaseUrl
  });
  const createQueryService = dependencies.createDeviceQueryService ?? createDeviceQueryService;

  return {
    deviceStateStore: new DeviceStateStore(),
    databaseClient,
    deviceQueryService: createQueryService(databaseClient as unknown as DeviceQueryDatabaseClient)
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
  app.register((instance) => registerDeviceRoutes(instance, services.deviceQueryService));
  app.register((instance) => registerNotificationRoutes(instance, services.deviceQueryService));

  return app;
}
