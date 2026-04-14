import { afterEach, describe, expect, it } from "vitest";

import { buildApp, type AppServices } from "../src/app.ts";
import type { DeviceCommandService } from "../src/modules/database/device-command-service.ts";
import type { DeviceQueryService } from "../src/modules/database/device-query-service.ts";
import { DeviceStateStore } from "../src/modules/devices/device-state-store.ts";

describe("api app", () => {
  let disconnectCount = 0;
  const deviceQueryService: DeviceQueryService = {
    listDeviceStates: async () => [],
    getDeviceState: async () => null,
    listDeviceTelemetry: async () => [],
    listNotifications: async () => []
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
  const services: AppServices = {
    deviceStateStore: new DeviceStateStore(),
    databaseClient: {
      $transaction: async () => undefined as never,
      $disconnect: async () => {
        disconnectCount += 1;
      }
    } as AppServices["databaseClient"],
    deviceQueryService,
    deviceCommandService
  };
  let app = buildApp(services);

  afterEach(async () => {
    await app.close();
    disconnectCount = 0;
    app = buildApp(services);
  });

  it("serves the health endpoint", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      service: "api",
      status: "ok"
    });
  });

  it("serves an empty device list before MQTT ingestion", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/devices"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: []
    });
  });

  it("disconnects the database client when the app closes", async () => {
    await app.close();

    expect(disconnectCount).toBe(1);
    app = buildApp(services);
    disconnectCount = 0;
  });
});
