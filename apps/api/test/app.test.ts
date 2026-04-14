import { afterEach, describe, expect, it } from "vitest";

import { buildApp, type AppServices } from "../src/app.ts";
import { DeviceStateStore } from "../src/modules/devices/device-state-store.ts";

describe("api app", () => {
  let disconnectCount = 0;
  const services: AppServices = {
    deviceStateStore: new DeviceStateStore(),
    databaseClient: {
      $disconnect: async () => {
        disconnectCount += 1;
      }
    } as AppServices["databaseClient"]
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
