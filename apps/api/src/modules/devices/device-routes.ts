import type { FastifyInstance } from "fastify";

import { normalizeDeviceMac } from "../../contracts/device-topics.ts";
import type { DeviceQueryService } from "../database/device-query-service.ts";

export async function registerDeviceRoutes(app: FastifyInstance, deviceQueryService: DeviceQueryService) {
  app.get("/devices", async () => {
    return {
      items: await deviceQueryService.listDeviceStates()
    };
  });

  app.get<{
    Params: {
      deviceMac: string;
    };
  }>("/devices/:deviceMac/state", async (request, reply) => {
    const deviceMac = normalizeDeviceMac(request.params.deviceMac);
    const state = await deviceQueryService.getDeviceState(deviceMac);

    if (!state) {
      reply.code(404);

      return {
        error: "Device state not found"
      };
    }

    return {
      item: state
    };
  });

  app.get<{
    Params: {
      deviceMac: string;
    };
  }>("/devices/:deviceMac/telemetry", async (request) => {
    const deviceMac = normalizeDeviceMac(request.params.deviceMac);

    return {
      items: await deviceQueryService.listDeviceTelemetry(deviceMac)
    };
  });
}
