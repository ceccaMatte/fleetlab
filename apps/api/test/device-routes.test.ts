import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp, createAppServices } from "../src/app.ts";
import { loadEnv } from "../src/config/env.ts";
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
    listDeviceStates: async () => [
      {
        deviceMac: "AA:BB:CC:DD:EE:FF",
        status: "online",
        firstSeenAt: "2026-04-14T16:30:00Z",
        lastSeenAt: "2026-04-14T16:30:00Z"
      }
    ],
    getDeviceState: async (deviceMac) =>
      deviceMac === "AA:BB:CC:DD:EE:FF"
        ? {
            deviceMac,
            status: "online",
            firstSeenAt: "2026-04-14T16:30:00Z",
            lastSeenAt: "2026-04-14T16:30:00Z"
          }
        : null,
    listDeviceTelemetry: async (deviceMac) => [
      {
        deviceMac,
        messageId: "11111111-1111-4111-8111-111111111111",
        sentAt: "2026-04-14T16:31:00Z",
        receivedAt: "2026-04-14T16:31:01Z",
        temperatureC: 22.4,
        humidityPct: 48.2
      }
    ],
    listNotifications: async () => []
  };

  return createAppServices(loadEnv({}), {
    createDatabaseClient: () => databaseClient,
    createDeviceQueryService: () => deviceQueryService
  });
}

describe("device routes", () => {
  let services = createTestServices();
  let app = buildApp(services);

  beforeEach(() => {
    services = createTestServices();
    app = buildApp(services);
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns the persisted device list", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/devices"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [
        {
          deviceMac: "AA:BB:CC:DD:EE:FF",
          status: "online",
          firstSeenAt: "2026-04-14T16:30:00Z",
          lastSeenAt: "2026-04-14T16:30:00Z"
        }
      ]
    });
  });

  it("returns device state by MAC address", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/devices/AA:BB:CC:DD:EE:FF/state"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      item: {
        deviceMac: "AA:BB:CC:DD:EE:FF",
        status: "online",
        firstSeenAt: "2026-04-14T16:30:00Z",
        lastSeenAt: "2026-04-14T16:30:00Z"
      }
    });
  });

  it("returns 404 when the device state does not exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/devices/AA:BB:CC:DD:EE:01/state"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Device state not found"
    });
  });

  it("returns persisted telemetry for a device", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/devices/AA:BB:CC:DD:EE:FF/telemetry"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [
        {
          deviceMac: "AA:BB:CC:DD:EE:FF",
          messageId: "11111111-1111-4111-8111-111111111111",
          sentAt: "2026-04-14T16:31:00Z",
          receivedAt: "2026-04-14T16:31:01Z",
          temperatureC: 22.4,
          humidityPct: 48.2
        }
      ]
    });
  });
});
