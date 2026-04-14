import type { FastifyInstance } from "fastify";

import type { DeviceQueryService } from "../database/device-query-service.ts";

export async function registerNotificationRoutes(app: FastifyInstance, deviceQueryService: DeviceQueryService) {
  app.get("/notifications", async () => {
    return {
      items: await deviceQueryService.listNotifications()
    };
  });
}
