import { describe, expect, it, vi } from "vitest";

import { createAppServices } from "../src/app.ts";
import type { ApiEnv } from "../src/config/env.ts";
import type { CreateDatabaseClientOptions, DatabaseClient } from "../src/modules/database/prisma-client.ts";

describe("createAppServices", () => {
  it("creates the database client from the configured database URL", () => {
    const env: ApiEnv = {
      host: "0.0.0.0",
      port: 3000,
      mqttHost: "0.0.0.0",
      mqttPort: 18830,
      databaseUrl: "postgresql://fleetlab:fleetlab@127.0.0.1:5432/fleetlab?schema=public"
    };
    const databaseClient = {
      $disconnect: vi.fn(async () => undefined)
    } satisfies DatabaseClient;
    const createDatabaseClient = vi.fn((options: CreateDatabaseClientOptions) => {
      expect(options).toEqual({
        databaseUrl: env.databaseUrl
      });

      return databaseClient;
    });

    const services = createAppServices(env, {
      createDatabaseClient
    });

    expect(createDatabaseClient).toHaveBeenCalledOnce();
    expect(services.databaseClient).toBe(databaseClient);
    expect(services.deviceStateStore.list()).toEqual([]);
  });
});
