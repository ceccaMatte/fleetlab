import type { FastifyInstance } from "fastify";

import { normalizeDeviceMac } from "../../contracts/device-topics.ts";
import type { DeviceStateStore } from "./device-state-store.ts";

export async function registerDeviceRoutes(app: FastifyInstance, deviceStateStore: DeviceStateStore) {
  app.get("/devices", async () => {
    return {
      items: deviceStateStore.list()
    };
  });

  app.get<{
    Params: {
      deviceMac: string;
    };
  }>("/devices/:deviceMac/state", async (request, reply) => {
    const deviceMac = normalizeDeviceMac(request.params.deviceMac);
    const state = deviceStateStore.get(deviceMac);

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
}
