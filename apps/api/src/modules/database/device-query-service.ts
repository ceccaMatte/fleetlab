import { DeviceNotificationStatus, type Prisma } from "@prisma/client";

import type {
  DeviceCapabilitiesSnapshot,
  DeviceLedState,
  DeviceStateProjection,
  DeviceTelemetrySnapshot
} from "../devices/device-state-projection.ts";

type PersistedDeviceRecord = Prisma.DeviceGetPayload<{
  include: {
    stateProjection: true;
  };
}>;

type PersistedTelemetryRecord = Prisma.TelemetryEventGetPayload<{
  include: {
    device: {
      select: {
        macAddress: true;
      };
    };
  };
}>;

type PersistedNotificationRecord = Prisma.DeviceNotificationGetPayload<{
  include: {
    device: {
      select: {
        macAddress: true;
      };
    };
  };
}>;

export interface DeviceTelemetryEventView {
  deviceMac: string;
  messageId: string;
  sentAt: string;
  receivedAt: string;
  temperatureC: number;
  humidityPct: number;
}

export interface DeviceNotificationView {
  deviceMac: string;
  messageId: string;
  sentAt: string;
  receivedAt: string;
  kind: string;
  message: string;
  status: "pending" | "acknowledged";
  acknowledgedAt?: string;
}

export interface DeviceQueryService {
  listDeviceStates(): Promise<DeviceStateProjection[]>;
  getDeviceState(deviceMac: string): Promise<DeviceStateProjection | null>;
  listDeviceTelemetry(deviceMac: string, limit?: number): Promise<DeviceTelemetryEventView[]>;
  listNotifications(limit?: number): Promise<DeviceNotificationView[]>;
}

export interface DeviceQueryDatabaseClient {
  device: {
    findMany(args: Prisma.DeviceFindManyArgs): Promise<PersistedDeviceRecord[]>;
    findUnique(args: Prisma.DeviceFindUniqueArgs): Promise<PersistedDeviceRecord | null>;
  };
  telemetryEvent: {
    findMany(args: Prisma.TelemetryEventFindManyArgs): Promise<PersistedTelemetryRecord[]>;
  };
  deviceNotification: {
    findMany(args: Prisma.DeviceNotificationFindManyArgs): Promise<PersistedNotificationRecord[]>;
  };
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function toCapabilitiesSnapshot(value: Prisma.JsonValue | null): DeviceCapabilitiesSnapshot | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.temperature !== "boolean" ||
    typeof candidate.humidity !== "boolean" ||
    typeof candidate.rgb_led !== "boolean" ||
    typeof candidate.notifications !== "boolean" ||
    typeof candidate.polling_config !== "boolean"
  ) {
    return undefined;
  }

  return {
    temperature: candidate.temperature,
    humidity: candidate.humidity,
    rgbLed: candidate.rgb_led,
    notifications: candidate.notifications,
    pollingConfig: candidate.polling_config
  };
}

function toTelemetrySnapshot(record: PersistedDeviceRecord["stateProjection"]): DeviceTelemetrySnapshot | undefined {
  if (
    !record?.telemetryReceivedAt ||
    record.temperatureC === null ||
    record.temperatureC === undefined ||
    record.humidityPct === null ||
    record.humidityPct === undefined
  ) {
    return undefined;
  }

  return {
    temperatureC: Number(record.temperatureC),
    humidityPct: Number(record.humidityPct),
    receivedAt: record.telemetryReceivedAt.toISOString()
  };
}

function toLedState(record: PersistedDeviceRecord["stateProjection"]): DeviceLedState | undefined {
  if (
    record?.ledPower === null ||
    record?.ledPower === undefined ||
    record.ledColorR === null ||
    record.ledColorR === undefined ||
    record.ledColorG === null ||
    record.ledColorG === undefined ||
    record.ledColorB === null ||
    record.ledColorB === undefined ||
    record.ledBrightness === null ||
    record.ledBrightness === undefined
  ) {
    return undefined;
  }

  return {
    power: record.ledPower,
    colorRgb: {
      r: record.ledColorR,
      g: record.ledColorG,
      b: record.ledColorB
    },
    brightness: record.ledBrightness
  };
}

function toMessageKind(value: NonNullable<PersistedDeviceRecord["stateProjection"]>["lastMessageKind"]) {
  return value ? value.toLowerCase() as DeviceStateProjection["lastMessageKind"] : undefined;
}

function mapDeviceState(device: PersistedDeviceRecord): DeviceStateProjection | null {
  const projection = device.stateProjection;

  if (!projection) {
    return null;
  }

  return {
    deviceMac: device.macAddress,
    status: projection.status as "online" | "offline",
    firstSeenAt: projection.firstSeenAt.toISOString(),
    lastSeenAt: projection.lastSeenAt.toISOString(),
    lastMessageKind: toMessageKind(projection.lastMessageKind),
    firmwareVersion: projection.firmwareVersion ?? device.firmwareVersion ?? undefined,
    capabilities:
      toCapabilitiesSnapshot(projection.capabilitiesJson) ??
      toCapabilitiesSnapshot(device.capabilitiesJson),
    telemetry: toTelemetrySnapshot(projection),
    lastNotificationAt: toIsoString(projection.lastNotificationAt),
    lastCommandAckAt: toIsoString(projection.lastCommandAckAt),
    lastConfigAckAt: toIsoString(projection.lastConfigAckAt),
    ledState: toLedState(projection)
  };
}

function mapTelemetryEvent(event: PersistedTelemetryRecord): DeviceTelemetryEventView {
  return {
    deviceMac: event.device.macAddress,
    messageId: event.messageId,
    sentAt: event.sentAt.toISOString(),
    receivedAt: event.receivedAt.toISOString(),
    temperatureC: Number(event.temperatureC),
    humidityPct: Number(event.humidityPct)
  };
}

function mapNotification(notification: PersistedNotificationRecord): DeviceNotificationView {
  return {
    deviceMac: notification.device.macAddress,
    messageId: notification.messageId,
    sentAt: notification.sentAt.toISOString(),
    receivedAt: notification.receivedAt.toISOString(),
    kind: notification.kind,
    message: notification.message,
    status: notification.status === DeviceNotificationStatus.PENDING ? "pending" : "acknowledged",
    acknowledgedAt: toIsoString(notification.acknowledgedAt)
  };
}

export function createDeviceQueryService(databaseClient: DeviceQueryDatabaseClient): DeviceQueryService {
  return {
    async listDeviceStates() {
      const devices = await databaseClient.device.findMany({
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

      return devices
        .map(mapDeviceState)
        .filter((state): state is DeviceStateProjection => state !== null);
    },
    async getDeviceState(deviceMac) {
      const device = await databaseClient.device.findUnique({
        where: {
          macAddress: deviceMac
        },
        include: {
          stateProjection: true
        }
      });

      return device ? mapDeviceState(device) : null;
    },
    async listDeviceTelemetry(deviceMac, limit = 20) {
      const events = await databaseClient.telemetryEvent.findMany({
        where: {
          device: {
            macAddress: deviceMac
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
        take: limit
      });

      return events.map(mapTelemetryEvent);
    },
    async listNotifications(limit = 50) {
      const notifications = await databaseClient.deviceNotification.findMany({
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
        take: limit
      });

      return notifications.map(mapNotification);
    }
  };
}
