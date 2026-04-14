import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildApp, type AppServices } from "../src/app.ts";
import type { DeviceCommandDispatchService } from "../src/modules/commands/device-command-dispatch-service.ts";
import type {
  DeviceCommandService,
  PendingCommandView
} from "../src/modules/database/device-command-service.ts";
import type { DeviceQueryService } from "../src/modules/database/device-query-service.ts";
import { DeviceStateStore } from "../src/modules/devices/device-state-store.ts";

function createPendingCommandView(
  overrides: Partial<PendingCommandView> = {}
): PendingCommandView {
  return {
    commandId: "11111111-1111-4111-8111-111111111111",
    deviceMac: "AA:BB:CC:DD:EE:FF",
    schemaVersion: 1,
    targetType: "command",
    commandType: "led.set",
    status: "pending",
    issuedAt: "2026-04-15T12:00:00.000Z",
    statusUpdatedAt: "2026-04-15T12:00:00.000Z",
    publishedAt: "2026-04-15T12:00:00.100Z",
    confirmedAt: undefined,
    failedAt: undefined,
    failureReason: undefined,
    requestedBy: "dashboard",
    payload: {
      power: true,
      color_rgb: {
        r: 255,
        g: 120,
        b: 0
      },
      brightness: 80
    },
    ...overrides
  };
}

function createTestServices() {
  const deviceQueryService = {
    listDeviceStates: vi.fn(async () => []),
    getDeviceState: vi.fn(async (deviceMac: string) =>
      deviceMac === "AA:BB:CC:DD:EE:FF"
        ? {
            deviceMac,
            status: "online" as const,
            firstSeenAt: "2026-04-14T16:30:00Z",
            lastSeenAt: "2026-04-15T12:00:00Z"
          }
        : deviceMac === "AA:BB:CC:DD:EE:01"
          ? {
              deviceMac,
              status: "offline" as const,
              firstSeenAt: "2026-04-14T16:30:00Z",
              lastSeenAt: "2026-04-15T11:50:00Z"
            }
          : null
    ),
    listDeviceTelemetry: vi.fn(async () => []),
    listNotifications: vi.fn(async () => [])
  } satisfies DeviceQueryService;
  const deviceCommandService = {
    createPendingCommand: vi.fn(async () => {
      throw new Error("not implemented");
    }),
    createPendingConfig: vi.fn(async () => {
      throw new Error("not implemented");
    }),
    markCommandPublished: vi.fn(async () => undefined),
    listCommands: vi.fn(async () => [
      createPendingCommandView(),
      createPendingCommandView({
        commandId: "22222222-2222-4222-8222-222222222222",
        targetType: "config",
        commandType: "polling.set",
        payload: {
          polling_interval_sec: 30
        }
      })
    ])
  } satisfies DeviceCommandService;
  const deviceCommandDispatchService = {
    dispatchCommand: vi.fn(async () => createPendingCommandView()),
    dispatchConfig: vi.fn(async () =>
      createPendingCommandView({
        commandId: "22222222-2222-4222-8222-222222222222",
        targetType: "config",
        commandType: "polling.set",
        payload: {
          polling_interval_sec: 30
        }
      })
    )
  } satisfies DeviceCommandDispatchService;

  const services: AppServices = {
    deviceStateStore: new DeviceStateStore(),
    databaseClient: {
      $transaction: async () => undefined as never,
      $disconnect: async () => undefined
    } as AppServices["databaseClient"],
    deviceQueryService,
    deviceCommandService,
    deviceCommandDispatchService
  };

  return {
    services,
    deviceQueryService,
    deviceCommandService,
    deviceCommandDispatchService
  };
}

describe("command routes", () => {
  let testContext = createTestServices();
  let app = buildApp(testContext.services);

  beforeEach(() => {
    testContext = createTestServices();
    app = buildApp(testContext.services);
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns the persisted command list", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/commands"
    });

    expect(response.statusCode).toBe(200);
    expect(testContext.deviceCommandService.listCommands).toHaveBeenCalledOnce();
    expect(response.json()).toEqual({
      items: [
        createPendingCommandView(),
        createPendingCommandView({
          commandId: "22222222-2222-4222-8222-222222222222",
          targetType: "config",
          commandType: "polling.set",
          payload: {
            polling_interval_sec: 30
          }
        })
      ]
    });
  });

  it("dispatches a command only when the device is online", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/devices/aa:bb:cc:dd:ee:ff/commands",
      payload: {
        requestedBy: "dashboard",
        power: true,
        colorRgb: {
          r: 255,
          g: 120,
          b: 0
        },
        brightness: 80
      }
    });

    expect(response.statusCode).toBe(202);
    expect(testContext.deviceCommandDispatchService.dispatchCommand).toHaveBeenCalledWith({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      issuedAt: expect.any(String),
      requestedBy: "dashboard",
      payload: {
        power: true,
        color_rgb: {
          r: 255,
          g: 120,
          b: 0
        },
        brightness: 80
      }
    });
    expect(response.json()).toEqual({
      item: createPendingCommandView()
    });
  });

  it("rejects commands for offline devices", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/devices/AA:BB:CC:DD:EE:01/commands",
      payload: {
        power: true,
        colorRgb: {
          r: 255,
          g: 120,
          b: 0
        },
        brightness: 80
      }
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      error: "Device is offline"
    });
    expect(testContext.deviceCommandDispatchService.dispatchCommand).not.toHaveBeenCalled();
  });

  it("returns 404 when a command targets an unknown device", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/devices/AA:BB:CC:DD:EE:99/commands",
      payload: {
        power: true,
        colorRgb: {
          r: 255,
          g: 120,
          b: 0
        },
        brightness: 80
      }
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      error: "Device state not found"
    });
    expect(testContext.deviceCommandDispatchService.dispatchCommand).not.toHaveBeenCalled();
  });

  it("validates command payloads before dispatch", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/devices/AA:BB:CC:DD:EE:FF/commands",
      payload: {
        power: true,
        brightness: 150
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      error: "Invalid command payload"
    });
    expect(testContext.deviceCommandDispatchService.dispatchCommand).not.toHaveBeenCalled();
  });

  it("dispatches config changes for online devices", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/devices/AA:BB:CC:DD:EE:FF/config",
      payload: {
        pollingIntervalSec: 30
      }
    });

    expect(response.statusCode).toBe(202);
    expect(testContext.deviceCommandDispatchService.dispatchConfig).toHaveBeenCalledWith({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      issuedAt: expect.any(String),
      requestedBy: undefined,
      pollingIntervalSec: 30
    });
    expect(response.json()).toEqual({
      item: createPendingCommandView({
        commandId: "22222222-2222-4222-8222-222222222222",
        targetType: "config",
        commandType: "polling.set",
        payload: {
          polling_interval_sec: 30
        }
      })
    });
  });
});
