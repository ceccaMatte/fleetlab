import { DeviceMessageKind, DeviceNotificationStatus, Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  createDeviceQueryService,
  type DeviceQueryDatabaseClient
} from "../src/modules/database/device-query-service.ts";

function createQueryDatabaseClient() {
  const findDevices = vi.fn<(...args: unknown[]) => Promise<Awaited<ReturnType<DeviceQueryDatabaseClient["device"]["findMany"]>>>>(
    async () => []
  );
  const findDevice = vi.fn<(...args: unknown[]) => Promise<Awaited<ReturnType<DeviceQueryDatabaseClient["device"]["findUnique"]>>>>(
    async () => null
  );
  const findTelemetry = vi.fn<
    (...args: unknown[]) => Promise<Awaited<ReturnType<DeviceQueryDatabaseClient["telemetryEvent"]["findMany"]>>>
  >(async () => []);
  const findNotifications = vi.fn<
    (...args: unknown[]) => Promise<Awaited<ReturnType<DeviceQueryDatabaseClient["deviceNotification"]["findMany"]>>>
  >(async () => []);

  return {
    device: {
      findMany: findDevices,
      findUnique: findDevice
    },
    telemetryEvent: {
      findMany: findTelemetry
    },
    deviceNotification: {
      findMany: findNotifications
    }
  } satisfies DeviceQueryDatabaseClient;
}

describe("device query service", () => {
  it("lists persisted device states mapped to the API view", async () => {
    const databaseClient = createQueryDatabaseClient();
    vi.mocked(databaseClient.device.findMany).mockResolvedValueOnce([
      {
        id: "device-1",
        macAddress: "AA:BB:CC:DD:EE:FF",
        displayName: null,
        displayColor: null,
        firmwareVersion: "0.1.0",
        capabilitiesJson: {
          temperature: true,
          humidity: true,
          rgb_led: true,
          notifications: true,
          polling_config: true
        },
        createdAt: new Date("2026-04-14T16:00:00Z"),
        updatedAt: new Date("2026-04-14T16:00:00Z"),
        stateProjection: {
          id: "projection-1",
          deviceId: "device-1",
          status: "online",
          firstSeenAt: new Date("2026-04-14T16:00:00Z"),
          lastSeenAt: new Date("2026-04-14T16:31:00Z"),
          lastMessageKind: DeviceMessageKind.TELEMETRY,
          firmwareVersion: "0.1.0",
          capabilitiesJson: null,
          telemetryReceivedAt: new Date("2026-04-14T16:31:00Z"),
          temperatureC: new Prisma.Decimal(22.4),
          humidityPct: new Prisma.Decimal(48.2),
          lastNotificationAt: new Date("2026-04-14T16:32:00Z"),
          lastCommandAckAt: new Date("2026-04-14T16:33:00Z"),
          lastConfigAckAt: null,
          ledPower: true,
          ledColorR: 255,
          ledColorG: 120,
          ledColorB: 0,
          ledBrightness: 80,
          pollingIntervalSec: null,
          updatedAt: new Date("2026-04-14T16:33:00Z")
        }
      }
    ]);
    const service = createDeviceQueryService(databaseClient);

    const states = await service.listDeviceStates();

    expect(databaseClient.device.findMany).toHaveBeenCalledWith({
      include: {
        stateProjection: true
      },
      where: {
        stateProjection: {
          isNot: null
        }
      },
      orderBy: {
        macAddress: "asc"
      }
    });
    expect(states).toEqual([
      {
        deviceMac: "AA:BB:CC:DD:EE:FF",
        status: "online",
        firstSeenAt: "2026-04-14T16:00:00.000Z",
        lastSeenAt: "2026-04-14T16:31:00.000Z",
        lastMessageKind: "telemetry",
        firmwareVersion: "0.1.0",
        capabilities: {
          temperature: true,
          humidity: true,
          rgbLed: true,
          notifications: true,
          pollingConfig: true
        },
        telemetry: {
          temperatureC: 22.4,
          humidityPct: 48.2,
          receivedAt: "2026-04-14T16:31:00.000Z"
        },
        lastNotificationAt: "2026-04-14T16:32:00.000Z",
        lastCommandAckAt: "2026-04-14T16:33:00.000Z",
        lastConfigAckAt: undefined,
        ledState: {
          power: true,
          colorRgb: {
            r: 255,
            g: 120,
            b: 0
          },
          brightness: 80
        }
      }
    ]);
  });

  it("returns null when the requested device state does not exist", async () => {
    const databaseClient = createQueryDatabaseClient();
    const service = createDeviceQueryService(databaseClient);

    await expect(service.getDeviceState("AA:BB:CC:DD:EE:FF")).resolves.toBeNull();
    expect(databaseClient.device.findUnique).toHaveBeenCalledWith({
      where: {
        macAddress: "AA:BB:CC:DD:EE:FF"
      },
      include: {
        stateProjection: true
      }
    });
  });

  it("lists recent telemetry events for a device from the persisted log", async () => {
    const databaseClient = createQueryDatabaseClient();
    vi.mocked(databaseClient.telemetryEvent.findMany).mockResolvedValueOnce([
      {
        id: "telemetry-1",
        deviceId: "device-1",
        messageId: "11111111-1111-4111-8111-111111111111",
        schemaVersion: 1,
        sentAt: new Date("2026-04-14T16:31:00Z"),
        receivedAt: new Date("2026-04-14T16:31:01Z"),
        temperatureC: new Prisma.Decimal(22.4),
        humidityPct: new Prisma.Decimal(48.2),
        device: {
          macAddress: "AA:BB:CC:DD:EE:FF"
        }
      }
    ]);
    const service = createDeviceQueryService(databaseClient);

    const items = await service.listDeviceTelemetry("AA:BB:CC:DD:EE:FF", 10);

    expect(databaseClient.telemetryEvent.findMany).toHaveBeenCalledWith({
      where: {
        device: {
          macAddress: "AA:BB:CC:DD:EE:FF"
        }
      },
      include: {
        device: {
          select: {
            macAddress: true
          }
        }
      },
      orderBy: {
        sentAt: "desc"
      },
      take: 10
    });
    expect(items).toEqual([
      {
        deviceMac: "AA:BB:CC:DD:EE:FF",
        messageId: "11111111-1111-4111-8111-111111111111",
        sentAt: "2026-04-14T16:31:00.000Z",
        receivedAt: "2026-04-14T16:31:01.000Z",
        temperatureC: 22.4,
        humidityPct: 48.2
      }
    ]);
  });

  it("lists persisted notifications mapped to the API view", async () => {
    const databaseClient = createQueryDatabaseClient();
    vi.mocked(databaseClient.deviceNotification.findMany).mockResolvedValueOnce([
      {
        id: "notification-1",
        deviceId: "device-1",
        messageId: "22222222-2222-4222-8222-222222222222",
        schemaVersion: 1,
        sentAt: new Date("2026-04-14T16:32:00Z"),
        receivedAt: new Date("2026-04-14T16:32:01Z"),
        kind: "generic",
        message: "Water tank low",
        status: DeviceNotificationStatus.PENDING,
        acknowledgedAt: null,
        device: {
          macAddress: "AA:BB:CC:DD:EE:FF"
        }
      }
    ]);
    const service = createDeviceQueryService(databaseClient);

    const items = await service.listNotifications(25);

    expect(databaseClient.deviceNotification.findMany).toHaveBeenCalledWith({
      include: {
        device: {
          select: {
            macAddress: true
          }
        }
      },
      orderBy: {
        sentAt: "desc"
      },
      take: 25
    });
    expect(items).toEqual([
      {
        deviceMac: "AA:BB:CC:DD:EE:FF",
        messageId: "22222222-2222-4222-8222-222222222222",
        sentAt: "2026-04-14T16:32:00.000Z",
        receivedAt: "2026-04-14T16:32:01.000Z",
        kind: "generic",
        message: "Water tank low",
        status: "pending",
        acknowledgedAt: undefined
      }
    ]);
  });
});
