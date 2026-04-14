import {
  DeviceCommandStatus,
  DeviceCommandTargetType,
  DeviceMessageKind,
  DeviceNotificationStatus,
  type Prisma
} from "@prisma/client";

import type { InboundDeviceMessage } from "../../contracts/device-message-codec.ts";

interface DeviceRecord {
  id: string;
}

interface DeviceCommandRecord {
  id: string;
}

export interface DevicePersistenceTransactionClient {
  device: {
    upsert(args: Prisma.DeviceUpsertArgs): Promise<DeviceRecord>;
  };
  telemetryEvent: {
    create(args: Prisma.TelemetryEventCreateArgs): Promise<unknown>;
  };
  deviceNotification: {
    create(args: Prisma.DeviceNotificationCreateArgs): Promise<unknown>;
  };
  deviceCommand: {
    findUnique(args: Prisma.DeviceCommandFindUniqueArgs): Promise<DeviceCommandRecord | null>;
  };
  deviceCommandAck: {
    create(args: Prisma.DeviceCommandAckCreateArgs): Promise<unknown>;
  };
  deviceStateProjection: {
    upsert(args: Prisma.DeviceStateProjectionUpsertArgs): Promise<unknown>;
  };
}

export interface DevicePersistenceDatabaseClient {
  $transaction<T>(fn: (tx: DevicePersistenceTransactionClient) => Promise<T>): Promise<T>;
}

export interface DevicePersistenceService {
  recordInboundMessage(message: InboundDeviceMessage): Promise<void>;
  recordPresence(deviceMac: string, status: "online" | "offline", observedAt: string): Promise<void>;
}

function toMessageKind(kind: InboundDeviceMessage["kind"]) {
  switch (kind) {
    case "hello":
      return DeviceMessageKind.HELLO;
    case "heartbeat":
      return DeviceMessageKind.HEARTBEAT;
    case "telemetry":
      return DeviceMessageKind.TELEMETRY;
    case "notification":
      return DeviceMessageKind.NOTIFICATION;
    case "ack":
      return DeviceMessageKind.ACK;
  }
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toCommandStatus(status: "confirmed" | "failed") {
  return status === "confirmed" ? DeviceCommandStatus.CONFIRMED : DeviceCommandStatus.FAILED;
}

function toTargetType(targetType: "command" | "config") {
  return targetType === "command" ? DeviceCommandTargetType.COMMAND : DeviceCommandTargetType.CONFIG;
}

async function upsertDeviceRecord(
  tx: DevicePersistenceTransactionClient,
  message: InboundDeviceMessage
) {
  const helloFields =
    message.kind === "hello"
      ? {
          firmwareVersion: message.payload.firmware_version,
          capabilitiesJson: toJsonValue(message.payload.capabilities)
        }
      : {};

  return tx.device.upsert({
    where: {
      macAddress: message.deviceMac
    },
    create: {
      macAddress: message.deviceMac,
      ...helloFields
    },
    update: helloFields,
    select: {
      id: true
    }
  });
}

function createProjectionUpsertArgs(
  deviceId: string,
  observedAt: Date,
  update: Record<string, unknown>,
  create: Record<string, unknown>
): Prisma.DeviceStateProjectionUpsertArgs {
  return {
    where: {
      deviceId
    },
    create: {
      ...create,
      device: {
        connect: {
          id: deviceId
        }
      },
      status: "online",
      firstSeenAt: observedAt,
      lastSeenAt: observedAt
    },
    update: {
      ...update,
      status: "online",
      lastSeenAt: observedAt
    }
  } as Prisma.DeviceStateProjectionUpsertArgs;
}

export function createDevicePersistenceService(
  databaseClient: DevicePersistenceDatabaseClient
): DevicePersistenceService {
  return {
    async recordPresence(deviceMac, status, observedAt) {
      const observedAtDate = new Date(observedAt);

      await databaseClient.$transaction(async (tx) => {
        const device = await tx.device.upsert({
          where: {
            macAddress: deviceMac
          },
          create: {
            macAddress: deviceMac
          },
          update: {},
          select: {
            id: true
          }
        });

        await tx.deviceStateProjection.upsert({
          where: {
            deviceId: device.id
          },
          create: {
            device: {
              connect: {
                id: device.id
              }
            },
            status,
            firstSeenAt: observedAtDate,
            lastSeenAt: observedAtDate
          },
          update: {
            status,
            lastSeenAt: observedAtDate
          }
        });
      });
    },
    async recordInboundMessage(message) {
      const observedAtDate = new Date(message.payload.sent_at);

      await databaseClient.$transaction(async (tx) => {
        const device = await upsertDeviceRecord(tx, message);

        switch (message.kind) {
          case "hello":
            await tx.deviceStateProjection.upsert(
              createProjectionUpsertArgs(
                device.id,
                observedAtDate,
                {
                  lastMessageKind: toMessageKind(message.kind),
                  firmwareVersion: message.payload.firmware_version,
                  capabilitiesJson: toJsonValue(message.payload.capabilities)
                },
                {
                  lastMessageKind: toMessageKind(message.kind),
                  firmwareVersion: message.payload.firmware_version,
                  capabilitiesJson: toJsonValue(message.payload.capabilities)
                }
              )
            );
            return;
          case "heartbeat":
            await tx.deviceStateProjection.upsert(
              createProjectionUpsertArgs(
                device.id,
                observedAtDate,
                {
                  lastMessageKind: toMessageKind(message.kind)
                },
                {
                  lastMessageKind: toMessageKind(message.kind)
                }
              )
            );
            return;
          case "telemetry":
            await tx.telemetryEvent.create({
              data: {
                device: {
                  connect: {
                    id: device.id
                  }
                },
                messageId: message.payload.message_id,
                schemaVersion: message.payload.schema_version,
                sentAt: observedAtDate,
                temperatureC: message.payload.temperature_c,
                humidityPct: message.payload.humidity_pct
              }
            });
            await tx.deviceStateProjection.upsert(
              createProjectionUpsertArgs(
                device.id,
                observedAtDate,
                {
                  lastMessageKind: toMessageKind(message.kind),
                  telemetryReceivedAt: observedAtDate,
                  temperatureC: message.payload.temperature_c,
                  humidityPct: message.payload.humidity_pct
                },
                {
                  lastMessageKind: toMessageKind(message.kind),
                  telemetryReceivedAt: observedAtDate,
                  temperatureC: message.payload.temperature_c,
                  humidityPct: message.payload.humidity_pct
                }
              )
            );
            return;
          case "notification":
            await tx.deviceNotification.create({
              data: {
                device: {
                  connect: {
                    id: device.id
                  }
                },
                messageId: message.payload.message_id,
                schemaVersion: message.payload.schema_version,
                sentAt: observedAtDate,
                kind: message.payload.kind,
                message: message.payload.message,
                status: DeviceNotificationStatus.PENDING
              }
            });
            await tx.deviceStateProjection.upsert(
              createProjectionUpsertArgs(
                device.id,
                observedAtDate,
                {
                  lastMessageKind: toMessageKind(message.kind),
                  lastNotificationAt: observedAtDate
                },
                {
                  lastMessageKind: toMessageKind(message.kind),
                  lastNotificationAt: observedAtDate
                }
              )
            );
            return;
          case "ack": {
            const command = await tx.deviceCommand.findUnique({
              where: {
                commandId: message.payload.target_id
              },
              select: {
                id: true
              }
            });

            await tx.deviceCommandAck.create({
              data: {
                device: {
                  connect: {
                    id: device.id
                  }
                },
                command: command
                  ? {
                      connect: {
                        id: command.id
                      }
                    }
                  : undefined,
                messageId: message.payload.message_id,
                schemaVersion: message.payload.schema_version,
                targetType: toTargetType(message.payload.target_type),
                targetId: message.payload.target_id,
                status: toCommandStatus(message.payload.status),
                sentAt: observedAtDate,
                resultJson: toJsonValue(message.payload.result)
              }
            });

            const ledProjection =
              message.payload.target_type === "command"
                ? {
                    lastCommandAckAt: observedAtDate,
                    ledPower: message.payload.result.applied_state.power,
                    ledColorR: message.payload.result.applied_state.color_rgb.r,
                    ledColorG: message.payload.result.applied_state.color_rgb.g,
                    ledColorB: message.payload.result.applied_state.color_rgb.b,
                    ledBrightness: message.payload.result.applied_state.brightness
                  }
                : {
                    lastConfigAckAt: observedAtDate
                  };

            await tx.deviceStateProjection.upsert(
              createProjectionUpsertArgs(
                device.id,
                observedAtDate,
                {
                  lastMessageKind: toMessageKind(message.kind),
                  ...ledProjection
                },
                {
                  lastMessageKind: toMessageKind(message.kind),
                  ...ledProjection
                }
              )
            );
            return;
          }
        }
      });
    }
  };
}
