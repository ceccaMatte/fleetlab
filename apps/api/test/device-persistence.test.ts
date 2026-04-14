import {
  DeviceCommandStatus,
  DeviceCommandTargetType,
  DeviceMessageKind,
  DeviceNotificationStatus
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import type { InboundDeviceMessage } from "../src/contracts/device-message-codec.ts";
import {
  createDevicePersistenceService,
  type DevicePersistenceDatabaseClient,
  type DevicePersistenceTransactionClient
} from "../src/modules/database/device-persistence.ts";

function createMockDatabaseClient() {
  const tx: DevicePersistenceTransactionClient = {
    device: {
      upsert: vi.fn(async () => ({ id: "device-1" }))
    },
    telemetryEvent: {
      create: vi.fn(async () => ({}))
    },
    deviceNotification: {
      create: vi.fn(async () => ({}))
    },
    deviceCommand: {
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({}))
    },
    deviceCommandAck: {
      create: vi.fn(async () => ({}))
    },
    deviceStateProjection: {
      upsert: vi.fn(async () => ({}))
    }
  };

  const transactionSpy = vi.fn(
    async (handler: (innerTx: DevicePersistenceTransactionClient) => Promise<unknown>) => handler(tx)
  );
  const client = {
    $transaction: transactionSpy as unknown as DevicePersistenceDatabaseClient["$transaction"]
  } satisfies DevicePersistenceDatabaseClient;

  return {
    client,
    tx,
    transactionSpy
  };
}

describe("device persistence service", () => {
  it("persists presence updates and upserts the state projection", async () => {
    const { client, tx, transactionSpy } = createMockDatabaseClient();
    const service = createDevicePersistenceService(client);

    await service.recordPresence("AA:BB:CC:DD:EE:FF", "offline", "2026-04-14T16:30:00Z");

    expect(transactionSpy).toHaveBeenCalledOnce();
    expect(tx.device.upsert).toHaveBeenCalledWith({
      where: {
        macAddress: "AA:BB:CC:DD:EE:FF"
      },
      create: {
        macAddress: "AA:BB:CC:DD:EE:FF"
      },
      update: {},
      select: {
        id: true
      }
    });
    expect(tx.deviceStateProjection.upsert).toHaveBeenCalledWith({
      where: {
        deviceId: "device-1"
      },
      create: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        status: "offline",
        firstSeenAt: new Date("2026-04-14T16:30:00Z"),
        lastSeenAt: new Date("2026-04-14T16:30:00Z")
      },
      update: {
        status: "offline",
        lastSeenAt: new Date("2026-04-14T16:30:00Z")
      }
    });
  });

  it("persists hello messages and updates device metadata", async () => {
    const { client, tx } = createMockDatabaseClient();
    const service = createDevicePersistenceService(client);
    const message: InboundDeviceMessage = {
      kind: "hello",
      topic: "fleetlab/devices/AA:BB:CC:DD:EE:FF/hello",
      deviceMac: "AA:BB:CC:DD:EE:FF",
      payload: {
        schema_version: 1,
        message_id: "11111111-1111-4111-8111-111111111111",
        device_mac: "AA:BB:CC:DD:EE:FF",
        sent_at: "2026-04-14T16:30:00Z",
        firmware_version: "0.1.0",
        capabilities: {
          temperature: true,
          humidity: true,
          rgb_led: true,
          notifications: true,
          polling_config: true
        }
      }
    };

    await service.recordInboundMessage(message);

    expect(tx.device.upsert).toHaveBeenCalledWith({
      where: {
        macAddress: "AA:BB:CC:DD:EE:FF"
      },
      create: {
        macAddress: "AA:BB:CC:DD:EE:FF",
        firmwareVersion: "0.1.0",
        capabilitiesJson: {
          temperature: true,
          humidity: true,
          rgb_led: true,
          notifications: true,
          polling_config: true
        }
      },
      update: {
        firmwareVersion: "0.1.0",
        capabilitiesJson: {
          temperature: true,
          humidity: true,
          rgb_led: true,
          notifications: true,
          polling_config: true
        }
      },
      select: {
        id: true
      }
    });
    expect(tx.deviceStateProjection.upsert).toHaveBeenCalledWith({
      where: {
        deviceId: "device-1"
      },
      create: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        status: "online",
        firstSeenAt: new Date("2026-04-14T16:30:00Z"),
        lastSeenAt: new Date("2026-04-14T16:30:00Z"),
        lastMessageKind: DeviceMessageKind.HELLO,
        firmwareVersion: "0.1.0",
        capabilitiesJson: {
          temperature: true,
          humidity: true,
          rgb_led: true,
          notifications: true,
          polling_config: true
        }
      },
      update: {
        status: "online",
        lastSeenAt: new Date("2026-04-14T16:30:00Z"),
        lastMessageKind: DeviceMessageKind.HELLO,
        firmwareVersion: "0.1.0",
        capabilitiesJson: {
          temperature: true,
          humidity: true,
          rgb_led: true,
          notifications: true,
          polling_config: true
        }
      }
    });
  });

  it("persists heartbeat messages without creating event records", async () => {
    const { client, tx, transactionSpy } = createMockDatabaseClient();
    const service = createDevicePersistenceService(client);

    await service.recordInboundMessage({
      kind: "heartbeat",
      topic: "fleetlab/devices/AA:BB:CC:DD:EE:FF/heartbeat",
      deviceMac: "AA:BB:CC:DD:EE:FF",
      payload: {
        schema_version: 1,
        message_id: "33333333-3333-4333-8333-333333333333",
        device_mac: "AA:BB:CC:DD:EE:FF",
        sent_at: "2026-04-14T16:35:00Z",
        uptime_ms: 123456,
        wifi_rssi: -61
      }
    });

    expect(transactionSpy).toHaveBeenCalledOnce();
    expect(tx.telemetryEvent.create).not.toHaveBeenCalled();
    expect(tx.deviceNotification.create).not.toHaveBeenCalled();
    expect(tx.deviceCommandAck.create).not.toHaveBeenCalled();
    expect(tx.deviceStateProjection.upsert).toHaveBeenCalledWith({
      where: {
        deviceId: "device-1"
      },
      create: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        status: "online",
        firstSeenAt: new Date("2026-04-14T16:35:00Z"),
        lastSeenAt: new Date("2026-04-14T16:35:00Z"),
        lastMessageKind: DeviceMessageKind.HEARTBEAT
      },
      update: {
        status: "online",
        lastSeenAt: new Date("2026-04-14T16:35:00Z"),
        lastMessageKind: DeviceMessageKind.HEARTBEAT
      }
    });
  });

  it("persists telemetry events and updates the projection snapshot", async () => {
    const { client, tx } = createMockDatabaseClient();
    const service = createDevicePersistenceService(client);
    const sentAt = new Date("2026-04-14T16:31:00Z");

    await service.recordInboundMessage({
      kind: "telemetry",
      topic: "fleetlab/devices/AA:BB:CC:DD:EE:FF/telemetry",
      deviceMac: "AA:BB:CC:DD:EE:FF",
      payload: {
        schema_version: 1,
        message_id: "22222222-2222-4222-8222-222222222222",
        device_mac: "AA:BB:CC:DD:EE:FF",
        sent_at: "2026-04-14T16:31:00Z",
        temperature_c: 22.4,
        humidity_pct: 48.2
      }
    });

    expect(tx.telemetryEvent.create).toHaveBeenCalledWith({
      data: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        messageId: "22222222-2222-4222-8222-222222222222",
        schemaVersion: 1,
        sentAt,
        temperatureC: 22.4,
        humidityPct: 48.2
      }
    });
    expect(tx.deviceStateProjection.upsert).toHaveBeenCalledWith({
      where: {
        deviceId: "device-1"
      },
      create: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        status: "online",
        firstSeenAt: sentAt,
        lastSeenAt: sentAt,
        lastMessageKind: DeviceMessageKind.TELEMETRY,
        telemetryReceivedAt: sentAt,
        temperatureC: 22.4,
        humidityPct: 48.2
      },
      update: {
        status: "online",
        lastSeenAt: sentAt,
        lastMessageKind: DeviceMessageKind.TELEMETRY,
        telemetryReceivedAt: sentAt,
        temperatureC: 22.4,
        humidityPct: 48.2
      }
    });
  });

  it("persists notifications and marks them pending", async () => {
    const { client, tx } = createMockDatabaseClient();
    const service = createDevicePersistenceService(client);
    const sentAt = new Date("2026-04-14T16:32:00Z");

    await service.recordInboundMessage({
      kind: "notification",
      topic: "fleetlab/devices/AA:BB:CC:DD:EE:FF/notification",
      deviceMac: "AA:BB:CC:DD:EE:FF",
      payload: {
        schema_version: 1,
        message_id: "44444444-4444-4444-8444-444444444444",
        device_mac: "AA:BB:CC:DD:EE:FF",
        sent_at: "2026-04-14T16:32:00Z",
        kind: "generic",
        message: "Water tank low"
      }
    });

    expect(tx.deviceNotification.create).toHaveBeenCalledWith({
      data: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        messageId: "44444444-4444-4444-8444-444444444444",
        schemaVersion: 1,
        sentAt,
        kind: "generic",
        message: "Water tank low",
        status: DeviceNotificationStatus.PENDING
      }
    });
    expect(tx.deviceStateProjection.upsert).toHaveBeenCalledWith({
      where: {
        deviceId: "device-1"
      },
      create: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        status: "online",
        firstSeenAt: sentAt,
        lastSeenAt: sentAt,
        lastMessageKind: DeviceMessageKind.NOTIFICATION,
        lastNotificationAt: sentAt
      },
      update: {
        status: "online",
        lastSeenAt: sentAt,
        lastMessageKind: DeviceMessageKind.NOTIFICATION,
        lastNotificationAt: sentAt
      }
    });
  });

  it("persists command acknowledgements, links the command when present and updates led state", async () => {
    const { client, tx } = createMockDatabaseClient();
    const service = createDevicePersistenceService(client);
    const sentAt = new Date("2026-04-14T16:33:00Z");
    vi.mocked(tx.deviceCommand.findUnique).mockResolvedValueOnce({
      id: "command-row-1"
    });

    await service.recordInboundMessage({
      kind: "ack",
      topic: "fleetlab/devices/AA:BB:CC:DD:EE:FF/ack",
      deviceMac: "AA:BB:CC:DD:EE:FF",
      payload: {
        schema_version: 1,
        message_id: "55555555-5555-4555-8555-555555555555",
        device_mac: "AA:BB:CC:DD:EE:FF",
        sent_at: "2026-04-14T16:33:00Z",
        target_type: "command",
        target_id: "66666666-6666-4666-8666-666666666666",
        status: "confirmed",
        result: {
          applied_state: {
            power: true,
            color_rgb: {
              r: 255,
              g: 120,
              b: 0
            },
            brightness: 80
          }
        }
      }
    });

    expect(tx.deviceCommand.findUnique).toHaveBeenCalledWith({
      where: {
        commandId: "66666666-6666-4666-8666-666666666666"
      },
      select: {
        id: true
      }
    });
    expect(tx.deviceCommandAck.create).toHaveBeenCalledWith({
      data: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        command: {
          connect: {
            id: "command-row-1"
          }
        },
        messageId: "55555555-5555-4555-8555-555555555555",
        schemaVersion: 1,
        targetType: DeviceCommandTargetType.COMMAND,
        targetId: "66666666-6666-4666-8666-666666666666",
        status: DeviceCommandStatus.CONFIRMED,
        sentAt,
        resultJson: {
          applied_state: {
            power: true,
            color_rgb: {
              r: 255,
              g: 120,
              b: 0
            },
            brightness: 80
          }
        }
      }
    });
    expect(tx.deviceCommand.update).toHaveBeenCalledWith({
      where: {
        id: "command-row-1"
      },
      data: {
        status: DeviceCommandStatus.CONFIRMED,
        statusUpdatedAt: sentAt,
        confirmedAt: sentAt,
        failedAt: null
      }
    });
    expect(tx.deviceStateProjection.upsert).toHaveBeenCalledWith({
      where: {
        deviceId: "device-1"
      },
      create: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        status: "online",
        firstSeenAt: sentAt,
        lastSeenAt: sentAt,
        lastMessageKind: DeviceMessageKind.ACK,
        lastCommandAckAt: sentAt,
        ledPower: true,
        ledColorR: 255,
        ledColorG: 120,
        ledColorB: 0,
        ledBrightness: 80
      },
      update: {
        status: "online",
        lastSeenAt: sentAt,
        lastMessageKind: DeviceMessageKind.ACK,
        lastCommandAckAt: sentAt,
        ledPower: true,
        ledColorR: 255,
        ledColorG: 120,
        ledColorB: 0,
        ledBrightness: 80
      }
    });
  });

  it("persists config acknowledgements without overwriting the led state", async () => {
    const { client, tx } = createMockDatabaseClient();
    const service = createDevicePersistenceService(client);
    const sentAt = new Date("2026-04-14T16:34:00Z");

    await service.recordInboundMessage({
      kind: "ack",
      topic: "fleetlab/devices/AA:BB:CC:DD:EE:FF/ack",
      deviceMac: "AA:BB:CC:DD:EE:FF",
      payload: {
        schema_version: 1,
        message_id: "77777777-7777-4777-8777-777777777777",
        device_mac: "AA:BB:CC:DD:EE:FF",
        sent_at: "2026-04-14T16:34:00Z",
        target_type: "config",
        target_id: "88888888-8888-4888-8888-888888888888",
        status: "failed",
        result: {
          applied_state: {
            power: false,
            color_rgb: {
              r: 0,
              g: 0,
              b: 0
            },
            brightness: 0
          }
        }
      }
    });

    expect(tx.deviceCommandAck.create).toHaveBeenCalledWith({
      data: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        command: undefined,
        messageId: "77777777-7777-4777-8777-777777777777",
        schemaVersion: 1,
        targetType: DeviceCommandTargetType.CONFIG,
        targetId: "88888888-8888-4888-8888-888888888888",
        status: DeviceCommandStatus.FAILED,
        sentAt,
        resultJson: {
          applied_state: {
            power: false,
            color_rgb: {
              r: 0,
              g: 0,
              b: 0
            },
            brightness: 0
          }
        }
      }
    });
    expect(tx.deviceCommand.update).not.toHaveBeenCalled();
    expect(tx.deviceStateProjection.upsert).toHaveBeenCalledWith({
      where: {
        deviceId: "device-1"
      },
      create: {
        device: {
          connect: {
            id: "device-1"
          }
        },
        status: "online",
        firstSeenAt: sentAt,
        lastSeenAt: sentAt,
        lastMessageKind: DeviceMessageKind.ACK,
        lastConfigAckAt: sentAt
      },
      update: {
        status: "online",
        lastSeenAt: sentAt,
        lastMessageKind: DeviceMessageKind.ACK,
        lastConfigAckAt: sentAt
      }
    });
  });
});
