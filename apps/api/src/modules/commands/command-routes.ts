import type { FastifyInstance } from "fastify";
import { z } from "zod";

import { normalizeDeviceMac } from "../../contracts/device-topics.ts";
import type { DeviceCommandDispatchService } from "./device-command-dispatch-service.ts";
import type { DeviceCommandService } from "../database/device-command-service.ts";
import type { DeviceQueryService } from "../database/device-query-service.ts";

const rgbColorRequestSchema = z.object({
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255)
});

const ledCommandRequestSchema = z.object({
  requestedBy: z.string().min(1).optional(),
  power: z.boolean(),
  colorRgb: rgbColorRequestSchema,
  brightness: z.number().int().min(0).max(100)
});

const configRequestSchema = z.object({
  requestedBy: z.string().min(1).optional(),
  pollingIntervalSec: z.number().int().positive()
});

async function requireOnlineDevice(
  deviceQueryService: DeviceQueryService,
  deviceMac: string
) {
  const state = await deviceQueryService.getDeviceState(deviceMac);

  if (!state) {
    return {
      ok: false as const,
      statusCode: 404,
      body: {
        error: "Device state not found"
      }
    };
  }

  if (state.status !== "online") {
    return {
      ok: false as const,
      statusCode: 409,
      body: {
        error: "Device is offline"
      }
    };
  }

  return {
    ok: true as const
  };
}

export async function registerCommandRoutes(
  app: FastifyInstance,
  deviceQueryService: DeviceQueryService,
  deviceCommandService: DeviceCommandService,
  deviceCommandDispatchService: DeviceCommandDispatchService
) {
  app.get("/commands", async () => {
    return {
      items: await deviceCommandService.listCommands()
    };
  });

  app.post<{
    Params: {
      deviceMac: string;
    };
    Body: unknown;
  }>("/devices/:deviceMac/commands", async (request, reply) => {
    const deviceMac = normalizeDeviceMac(request.params.deviceMac);
    const parsedBody = ledCommandRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      reply.code(400);

      return {
        error: "Invalid command payload"
      };
    }

    const onlineCheck = await requireOnlineDevice(deviceQueryService, deviceMac);

    if (!onlineCheck.ok) {
      reply.code(onlineCheck.statusCode);
      return onlineCheck.body;
    }

    const item = await deviceCommandDispatchService.dispatchCommand({
      deviceMac,
      issuedAt: new Date().toISOString(),
      requestedBy: parsedBody.data.requestedBy,
      payload: {
        power: parsedBody.data.power,
        color_rgb: parsedBody.data.colorRgb,
        brightness: parsedBody.data.brightness
      }
    });

    reply.code(202);

    return {
      item
    };
  });

  app.post<{
    Params: {
      deviceMac: string;
    };
    Body: unknown;
  }>("/devices/:deviceMac/config", async (request, reply) => {
    const deviceMac = normalizeDeviceMac(request.params.deviceMac);
    const parsedBody = configRequestSchema.safeParse(request.body);

    if (!parsedBody.success) {
      reply.code(400);

      return {
        error: "Invalid config payload"
      };
    }

    const onlineCheck = await requireOnlineDevice(deviceQueryService, deviceMac);

    if (!onlineCheck.ok) {
      reply.code(onlineCheck.statusCode);
      return onlineCheck.body;
    }

    const item = await deviceCommandDispatchService.dispatchConfig({
      deviceMac,
      issuedAt: new Date().toISOString(),
      requestedBy: parsedBody.data.requestedBy,
      pollingIntervalSec: parsedBody.data.pollingIntervalSec
    });

    reply.code(202);

    return {
      item
    };
  });
}
