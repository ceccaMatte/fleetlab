import { afterEach, describe, expect, it } from "vitest";

import { buildApp } from "../src/app.ts";

describe("api app", () => {
  let app = buildApp();

  afterEach(async () => {
    await app.close();
    app = buildApp();
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
});
