import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp, createAppServices } from "../src/app.ts";
import { loadEnv } from "../src/config/env.ts";
import type { DeviceCommandService } from "../src/modules/database/device-command-service.ts";
import type { DeviceQueryService } from "../src/modules/database/device-query-service.ts";
import type { DevicePersistenceTransactionClient } from "../src/modules/database/device-persistence.ts";
import type { DatabaseClient } from "../src/modules/database/prisma-client.ts";

function createTestServices() {
  const databaseClient = {
    $transaction: (async (handler: (tx: DevicePersistenceTransactionClient) => Promise<unknown>) =>
      handler({} as never)) as unknown as DatabaseClient["$transaction"],
    $disconnect: async () => undefined
  } satisfies DatabaseClient;
  const deviceQueryService: DeviceQueryService = {
    listDeviceStates: async () => [],
    getDeviceState: async () => null,
    listDeviceTelemetry: async () => [],
    listNotifications: async () => [
      {
        deviceMac: "AA:BB:CC:DD:EE:FF",
        messageId: "22222222-2222-4222-8222-222222222222",
        sentAt: "2026-04-14T16:32:00Z",
        receivedAt: "2026-04-14T16:32:01Z",
        kind: "generic",
        message: "Water tank low",
        status: "pending"
      }
    ]
  };
  const deviceCommandService: DeviceCommandService = {
    createPendingCommand: async () => {
      throw new Error("not implemented");
    },
    createPendingConfig: async () => {
      throw new Error("not implemented");
    },
    markCommandPublished: async () => undefined,
    listCommands: async () => []
  };

  return createAppServices(loadEnv({}), {
    createDatabaseClient: () => databaseClient,
    createDeviceQueryService: () => deviceQueryService,
    createDeviceCommandService: () => deviceCommandService
  });
}

describe("notification routes", () => {
  let services = createTestServices();
  let app = buildApp(services);

  beforeEach(() => {
    services = createTestServices();
    app = buildApp(services);
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns persisted notifications", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/notifications"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [
        {
          deviceMac: "AA:BB:CC:DD:EE:FF",
          messageId: "22222222-2222-4222-8222-222222222222",
          sentAt: "2026-04-14T16:32:00Z",
          receivedAt: "2026-04-14T16:32:01Z",
          kind: "generic",
          message: "Water tank low",
          status: "pending"
        }
      ]
    });
  });
});
