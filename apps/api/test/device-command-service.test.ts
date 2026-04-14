import {
  DeviceCommandStatus,
  DeviceCommandTargetType
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  createDeviceCommandService,
  type DeviceCommandDatabaseClient
} from "../src/modules/database/device-command-service.ts";

function createCommandDatabaseClient() {
  const findDevice = vi.fn<
    (...args: unknown[]) => Promise<Awaited<ReturnType<DeviceCommandDatabaseClient["device"]["findUnique"]>>>
  >(async () => null);
  const createCommand = vi.fn<
    (...args: unknown[]) => Promise<Awaited<ReturnType<DeviceCommandDatabaseClient["deviceCommand"]["create"]>>>
  >(async () => {
    throw new Error("not mocked");
  });
  const updateCommand = vi.fn<
    (...args: unknown[]) => Promise<Awaited<ReturnType<DeviceCommandDatabaseClient["deviceCommand"]["update"]>>>
  >(async () => ({}));
  const findCommands = vi.fn<
    (...args: unknown[]) => Promise<Awaited<ReturnType<DeviceCommandDatabaseClient["deviceCommand"]["findMany"]>>>
  >(async () => []);

  return {
    device: {
      findUnique: findDevice
    },
    deviceCommand: {
      create: createCommand,
      update: updateCommand,
      findMany: findCommands
    }
  } satisfies DeviceCommandDatabaseClient;
}

describe("device command service", () => {
  it("creates a pending led command for a known device", async () => {
    const databaseClient = createCommandDatabaseClient();
    vi.mocked(databaseClient.device.findUnique).mockResolvedValueOnce({
      id: "device-1"
    });
    vi.mocked(databaseClient.deviceCommand.create).mockResolvedValueOnce({
      id: "row-1",
      deviceId: "device-1",
      commandId: "11111111-1111-4111-8111-111111111111",
      schemaVersion: 1,
      targetType: DeviceCommandTargetType.COMMAND,
      issuedAt: new Date("2026-04-15T10:00:00Z"),
      requestedBy: "dashboard",
      commandType: "led.set",
      payloadJson: {
        power: true,
        color_rgb: {
          r: 255,
          g: 120,
          b: 0
        },
        brightness: 80
      },
      status: DeviceCommandStatus.PENDING,
      statusUpdatedAt: new Date("2026-04-15T10:00:00Z"),
      publishedAt: null,
      confirmedAt: null,
      failedAt: null,
      failureReason: null,
      device: {
        macAddress: "AA:BB:CC:DD:EE:FF"
      }
    });
    const service = createDeviceCommandService(databaseClient, {
      generateCommandId: () => "11111111-1111-4111-8111-111111111111"
    });

    const item = await service.createPendingCommand({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      issuedAt: "2026-04-15T10:00:00Z",
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

    expect(databaseClient.device.findUnique).toHaveBeenCalledWith({
      where: {
        macAddress: "AA:BB:CC:DD:EE:FF"
      },
      select: {
        id: true
      }
    });
    expect(databaseClient.deviceCommand.create).toHaveBeenCalledWith({
      data: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        commandId: "11111111-1111-4111-8111-111111111111",
        schemaVersion: 1,
        targetType: DeviceCommandTargetType.COMMAND,
        issuedAt: new Date("2026-04-15T10:00:00Z"),
        requestedBy: "dashboard",
        commandType: "led.set",
        payloadJson: {
          power: true,
          color_rgb: {
            r: 255,
            g: 120,
            b: 0
          },
          brightness: 80
        },
        status: DeviceCommandStatus.PENDING,
        statusUpdatedAt: new Date("2026-04-15T10:00:00Z")
      },
      include: {
        device: {
          select: {
            macAddress: true
          }
        }
      }
    });
    expect(item).toEqual({
      commandId: "11111111-1111-4111-8111-111111111111",
      deviceMac: "AA:BB:CC:DD:EE:FF",
      schemaVersion: 1,
      targetType: "command",
      commandType: "led.set",
      status: "pending",
      issuedAt: "2026-04-15T10:00:00.000Z",
      statusUpdatedAt: "2026-04-15T10:00:00.000Z",
      publishedAt: undefined,
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
      }
    });
  });

  it("creates a pending config record for a known device", async () => {
    const databaseClient = createCommandDatabaseClient();
    vi.mocked(databaseClient.device.findUnique).mockResolvedValueOnce({
      id: "device-1"
    });
    vi.mocked(databaseClient.deviceCommand.create).mockResolvedValueOnce({
      id: "row-2",
      deviceId: "device-1",
      commandId: "22222222-2222-4222-8222-222222222222",
      schemaVersion: 1,
      targetType: DeviceCommandTargetType.CONFIG,
      issuedAt: new Date("2026-04-15T10:05:00Z"),
      requestedBy: null,
      commandType: "polling.set",
      payloadJson: {
        polling_interval_sec: 30
      },
      status: DeviceCommandStatus.PENDING,
      statusUpdatedAt: new Date("2026-04-15T10:05:00Z"),
      publishedAt: null,
      confirmedAt: null,
      failedAt: null,
      failureReason: null,
      device: {
        macAddress: "AA:BB:CC:DD:EE:FF"
      }
    });
    const service = createDeviceCommandService(databaseClient, {
      generateCommandId: () => "22222222-2222-4222-8222-222222222222"
    });

    const item = await service.createPendingConfig({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      issuedAt: "2026-04-15T10:05:00Z",
      pollingIntervalSec: 30
    });

    expect(databaseClient.deviceCommand.create).toHaveBeenCalledWith({
      data: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        commandId: "22222222-2222-4222-8222-222222222222",
        schemaVersion: 1,
        targetType: DeviceCommandTargetType.CONFIG,
        issuedAt: new Date("2026-04-15T10:05:00Z"),
        requestedBy: undefined,
        commandType: "polling.set",
        payloadJson: {
          polling_interval_sec: 30
        },
        status: DeviceCommandStatus.PENDING,
        statusUpdatedAt: new Date("2026-04-15T10:05:00Z")
      },
      include: {
        device: {
          select: {
            macAddress: true
          }
        }
      }
    });
    expect(item).toEqual({
      commandId: "22222222-2222-4222-8222-222222222222",
      deviceMac: "AA:BB:CC:DD:EE:FF",
      schemaVersion: 1,
      targetType: "config",
      commandType: "polling.set",
      status: "pending",
      issuedAt: "2026-04-15T10:05:00.000Z",
      statusUpdatedAt: "2026-04-15T10:05:00.000Z",
      publishedAt: undefined,
      confirmedAt: undefined,
      failedAt: undefined,
      failureReason: undefined,
      requestedBy: undefined,
      payload: {
        polling_interval_sec: 30
      }
    });
  });

  it("marks a command as published", async () => {
    const databaseClient = createCommandDatabaseClient();
    const service = createDeviceCommandService(databaseClient);

    await service.markCommandPublished(
      "33333333-3333-4333-8333-333333333333",
      "2026-04-15T10:10:00Z"
    );

    expect(databaseClient.deviceCommand.update).toHaveBeenCalledWith({
      where: {
        commandId: "33333333-3333-4333-8333-333333333333"
      },
      data: {
        publishedAt: new Date("2026-04-15T10:10:00Z")
      }
    });
  });

  it("lists persisted commands ordered by issue time", async () => {
    const databaseClient = createCommandDatabaseClient();
    vi.mocked(databaseClient.deviceCommand.findMany).mockResolvedValueOnce([
      {
        id: "row-3",
        deviceId: "device-1",
        commandId: "44444444-4444-4444-8444-444444444444",
        schemaVersion: 1,
        targetType: DeviceCommandTargetType.CONFIG,
        issuedAt: new Date("2026-04-15T10:20:00Z"),
        requestedBy: null,
        commandType: "polling.set",
        payloadJson: {
          polling_interval_sec: 60
        },
        status: DeviceCommandStatus.CONFIRMED,
        statusUpdatedAt: new Date("2026-04-15T10:21:00Z"),
        publishedAt: new Date("2026-04-15T10:20:01Z"),
        confirmedAt: new Date("2026-04-15T10:21:00Z"),
        failedAt: null,
        failureReason: null,
        device: {
          macAddress: "AA:BB:CC:DD:EE:FF"
        }
      }
    ]);
    const service = createDeviceCommandService(databaseClient);

    const items = await service.listCommands(25);

    expect(databaseClient.deviceCommand.findMany).toHaveBeenCalledWith({
      include: {
        device: {
          select: {
            macAddress: true
          }
        }
      },
      orderBy: {
        issuedAt: "desc"
      },
      take: 25
    });
    expect(items).toEqual([
      {
        commandId: "44444444-4444-4444-8444-444444444444",
        deviceMac: "AA:BB:CC:DD:EE:FF",
        schemaVersion: 1,
        targetType: "config",
        commandType: "polling.set",
        status: "confirmed",
        issuedAt: "2026-04-15T10:20:00.000Z",
        statusUpdatedAt: "2026-04-15T10:21:00.000Z",
        publishedAt: "2026-04-15T10:20:01.000Z",
        confirmedAt: "2026-04-15T10:21:00.000Z",
        failedAt: undefined,
        failureReason: undefined,
        requestedBy: undefined,
        payload: {
          polling_interval_sec: 60
        }
      }
    ]);
  });

  it("rejects pending commands for unknown devices", async () => {
    const databaseClient = createCommandDatabaseClient();
    const service = createDeviceCommandService(databaseClient);

    await expect(
      service.createPendingCommand({
        deviceMac: "AA:BB:CC:DD:EE:FF",
        issuedAt: "2026-04-15T10:00:00Z",
        payload: {
          power: true,
          color_rgb: {
            r: 255,
            g: 120,
            b: 0
          },
          brightness: 80
        }
      })
    ).rejects.toThrow("Unknown device: AA:BB:CC:DD:EE:FF");

    expect(databaseClient.deviceCommand.create).not.toHaveBeenCalled();
  });
});
