import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { buildApp, createAppServices } from "../src/app.ts";
import { loadEnv } from "../src/config/env.ts";
import type { DevicePersistenceTransactionClient } from "../src/modules/database/device-persistence.ts";
import type { DatabaseClient } from "../src/modules/database/prisma-client.ts";

function createTestServices() {
  const databaseClient = {
    $transaction: (async (handler: (tx: DevicePersistenceTransactionClient) => Promise<unknown>) =>
      handler({} as never)) as unknown as DatabaseClient["$transaction"],
    $disconnect: async () => undefined
  } satisfies DatabaseClient;

  return createAppServices(loadEnv({}), {
    createDatabaseClient: () => databaseClient
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

  it("returns device state by MAC address", async () => {
    services.deviceStateStore.applyPresence("AA:BB:CC:DD:EE:FF", "online", "2026-04-14T16:30:00Z");

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
      url: "/devices/AA:BB:CC:DD:EE:FF/state"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Device state not found"
    });
  });
});
