import { describe, expect, it, vi } from "vitest";

import { createPrismaClient } from "../src/modules/database/prisma-client.ts";

describe("createPrismaClient", () => {
  it("passes the configured datasource URL to PrismaClient", async () => {
    const disconnect = vi.fn(async () => undefined);
    const constructorSpy = vi.fn();
    class PrismaClientCtor {
      options: unknown;

      constructor(options: unknown) {
        constructorSpy(options);
        this.options = options;
      }

      async $disconnect() {
        await disconnect();
      }
    }

    const client = createPrismaClient(
      {
        databaseUrl: "postgresql://fleetlab:fleetlab@127.0.0.1:5432/fleetlab?schema=public"
      },
      PrismaClientCtor as never
    );

    expect(constructorSpy).toHaveBeenCalledWith({
      datasources: {
        db: {
          url: "postgresql://fleetlab:fleetlab@127.0.0.1:5432/fleetlab?schema=public"
        }
      }
    });
    await client.$disconnect();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
