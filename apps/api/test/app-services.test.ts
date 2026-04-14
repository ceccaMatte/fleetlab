import { describe, expect, it, vi } from "vitest";

import { createAppServices } from "../src/app.ts";
import type { ApiEnv } from "../src/config/env.ts";
import type { DeviceCommandService } from "../src/modules/database/device-command-service.ts";
import type { DeviceQueryService } from "../src/modules/database/device-query-service.ts";
import type { DevicePersistenceTransactionClient } from "../src/modules/database/device-persistence.ts";
import type { CreateDatabaseClientOptions, DatabaseClient } from "../src/modules/database/prisma-client.ts";

describe("createAppServices", () => {
  it("creates the database client and query service from the configured database URL", () => {
    const env: ApiEnv = {
      host: "0.0.0.0",
      port: 3000,
      mqttHost: "0.0.0.0",
      mqttPort: 18830,
      databaseUrl: "postgresql://fleetlab:fleetlab@127.0.0.1:5432/fleetlab?schema=public"
    };
    const transactionSpy = vi.fn(
      async (handler: (tx: DevicePersistenceTransactionClient) => Promise<unknown>) => handler({} as never)
    );
    const databaseClient = {
      $transaction: transactionSpy as unknown as DatabaseClient["$transaction"],
      $disconnect: vi.fn(async () => undefined)
    } satisfies DatabaseClient;
    const createDatabaseClient = vi.fn((options: CreateDatabaseClientOptions) => {
      expect(options).toEqual({
        databaseUrl: env.databaseUrl
      });

      return databaseClient;
    });
    const deviceQueryService = {
      listDeviceStates: vi.fn(async () => []),
      getDeviceState: vi.fn(async () => null),
      listDeviceTelemetry: vi.fn(async () => []),
      listNotifications: vi.fn(async () => [])
    } satisfies DeviceQueryService;
    const createQueryService = vi.fn(() => deviceQueryService);
    const deviceCommandService = {
      createPendingCommand: vi.fn(async () => {
        throw new Error("not implemented");
      }),
      createPendingConfig: vi.fn(async () => {
        throw new Error("not implemented");
      }),
      markCommandPublished: vi.fn(async () => undefined),
      listCommands: vi.fn(async () => [])
    } satisfies DeviceCommandService;
    const createCommandService = vi.fn(() => deviceCommandService);

    const services = createAppServices(env, {
      createDatabaseClient,
      createDeviceQueryService: createQueryService,
      createDeviceCommandService: createCommandService
    });

    expect(createDatabaseClient).toHaveBeenCalledOnce();
    expect(createQueryService).toHaveBeenCalledWith(databaseClient);
    expect(createCommandService).toHaveBeenCalledWith(databaseClient);
    expect(services.databaseClient).toBe(databaseClient);
    expect(services.deviceQueryService).toBe(deviceQueryService);
    expect(services.deviceCommandService).toBe(deviceCommandService);
    expect(services.deviceStateStore.list()).toEqual([]);
  });
});
