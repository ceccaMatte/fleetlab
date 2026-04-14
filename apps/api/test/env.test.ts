import { describe, expect, it } from "vitest";

import { loadEnv } from "../src/config/env.ts";

describe("loadEnv", () => {
  it("uses default host and port when env is empty", () => {
    expect(loadEnv({})).toEqual({
      host: "0.0.0.0",
      port: 3000,
      mqttHost: "0.0.0.0",
      mqttPort: 18830,
      databaseUrl: "postgresql://fleetlab:fleetlab@127.0.0.1:5432/fleetlab?schema=public"
    });
  });

  it("throws when API_PORT or MQTT_PORT are not positive integers", () => {
    expect(() => loadEnv({ API_PORT: "0" })).toThrow("Invalid API_PORT value: 0");
    expect(() => loadEnv({ API_PORT: "abc" })).toThrow("Invalid API_PORT value: abc");
    expect(() => loadEnv({ MQTT_PORT: "0" })).toThrow("Invalid MQTT_PORT value: 0");
    expect(() => loadEnv({ MQTT_PORT: "abc" })).toThrow("Invalid MQTT_PORT value: abc");
  });

  it("allows overriding the database URL", () => {
    expect(
      loadEnv({
        DATABASE_URL: "postgresql://custom-user:secret@db:5432/custom-db?schema=public"
      }).databaseUrl
    ).toBe("postgresql://custom-user:secret@db:5432/custom-db?schema=public");
  });
});
