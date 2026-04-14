import Fastify from "fastify";

import type { ApiEnv } from "./config/env.ts";
import {
  createDeviceCommandService,
  type DeviceCommandDatabaseClient,
  type DeviceCommandService
} from "./modules/database/device-command-service.ts";
import {
  createDeviceQueryService,
  type DeviceQueryDatabaseClient,
  type DeviceQueryService
} from "./modules/database/device-query-service.ts";
import { DeviceStateStore } from "./modules/devices/device-state-store.ts";
import { registerDeviceRoutes } from "./modules/devices/device-routes.ts";
import { registerHealthRoutes } from "./modules/health/health-routes.ts";
import { registerNotificationRoutes } from "./modules/notifications/notification-routes.ts";
import type { DeviceCommandDispatchService } from "./modules/commands/device-command-dispatch-service.ts";
import { registerCommandRoutes } from "./modules/commands/command-routes.ts";
import { createPrismaClient, type DatabaseClient, type DatabaseClientFactory } from "./modules/database/prisma-client.ts";

export interface AppServices {
  deviceStateStore: DeviceStateStore;
  databaseClient: DatabaseClient;
  deviceQueryService: DeviceQueryService;
  deviceCommandService: DeviceCommandService;
  deviceCommandDispatchService?: DeviceCommandDispatchService;
}

export interface AppServiceDependencies {
  createDatabaseClient?: DatabaseClientFactory;
  createDeviceQueryService?: (databaseClient: DeviceQueryDatabaseClient) => DeviceQueryService;
  createDeviceCommandService?: (databaseClient: DeviceCommandDatabaseClient) => DeviceCommandService;
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
  const createCommandService =
    dependencies.createDeviceCommandService ?? createDeviceCommandService;

  return {
    deviceStateStore: new DeviceStateStore(),
    databaseClient,
    deviceQueryService: createQueryService(databaseClient as unknown as DeviceQueryDatabaseClient),
    deviceCommandService: createCommandService(databaseClient as unknown as DeviceCommandDatabaseClient)
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

  if (services.deviceCommandDispatchService) {
    app.register((instance) =>
      registerCommandRoutes(
        instance,
        services.deviceQueryService,
        services.deviceCommandService,
        services.deviceCommandDispatchService!
      )
    );
  }

  return app;
}
