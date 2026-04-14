import {
  DeviceCommandStatus,
  DeviceCommandTargetType,
  type Prisma
} from "@prisma/client";
import { randomUUID } from "node:crypto";

type PersistedCommandRecord = Prisma.DeviceCommandGetPayload<{
  include: {
    device: {
      select: {
        macAddress: true;
      };
    };
  };
}>;

interface DeviceRecord {
  id: string;
}

export interface CommandPayload {
  power: boolean;
  color_rgb: {
    r: number;
    g: number;
    b: number;
  };
  brightness: number;
}

export interface ConfigPayload {
  polling_interval_sec: number;
}

export interface PendingCommandView {
  commandId: string;
  deviceMac: string;
  schemaVersion: 1;
  targetType: "command" | "config";
  commandType: string;
  status: "pending" | "confirmed" | "failed";
  issuedAt: string;
  statusUpdatedAt: string;
  publishedAt?: string;
  confirmedAt?: string;
  failedAt?: string;
  failureReason?: string;
  requestedBy?: string;
  payload: CommandPayload | ConfigPayload;
}

export interface DeviceCommandDatabaseClient {
  device: {
    findUnique(args: Prisma.DeviceFindUniqueArgs): Promise<DeviceRecord | null>;
  };
  deviceCommand: {
    create(args: Prisma.DeviceCommandCreateArgs): Promise<PersistedCommandRecord>;
    update(args: Prisma.DeviceCommandUpdateArgs): Promise<unknown>;
    findMany(args: Prisma.DeviceCommandFindManyArgs): Promise<PersistedCommandRecord[]>;
  };
}

export interface CreatePendingCommandInput {
  deviceMac: string;
  issuedAt: string;
  payload: CommandPayload;
  requestedBy?: string;
}

export interface CreatePendingConfigInput {
  deviceMac: string;
  issuedAt: string;
  pollingIntervalSec: number;
  requestedBy?: string;
}

export interface DeviceCommandService {
  createPendingCommand(input: CreatePendingCommandInput): Promise<PendingCommandView>;
  createPendingConfig(input: CreatePendingConfigInput): Promise<PendingCommandView>;
  markCommandPublished(commandId: string, publishedAt?: string): Promise<void>;
  listCommands(limit?: number): Promise<PendingCommandView[]>;
}

export interface DeviceCommandServiceDependencies {
  generateCommandId?: () => string;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toStatus(status: DeviceCommandStatus): PendingCommandView["status"] {
  return status.toLowerCase() as PendingCommandView["status"];
}

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : undefined;
}

function mapCommandPayload(value: Prisma.JsonValue): CommandPayload | ConfigPayload {
  return value as unknown as CommandPayload | ConfigPayload;
}

function toPendingCommandView(record: PersistedCommandRecord): PendingCommandView {
  return {
    commandId: record.commandId,
    deviceMac: record.device.macAddress,
    schemaVersion: record.schemaVersion as 1,
    targetType: record.targetType === DeviceCommandTargetType.COMMAND ? "command" : "config",
    commandType: record.commandType,
    status: toStatus(record.status),
    issuedAt: record.issuedAt.toISOString(),
    statusUpdatedAt: record.statusUpdatedAt.toISOString(),
    publishedAt: toIsoString(record.publishedAt),
    confirmedAt: toIsoString(record.confirmedAt),
    failedAt: toIsoString(record.failedAt),
    failureReason: record.failureReason ?? undefined,
    requestedBy: record.requestedBy ?? undefined,
    payload: mapCommandPayload(record.payloadJson)
  };
}

async function requireDevice(
  databaseClient: DeviceCommandDatabaseClient,
  deviceMac: string
): Promise<DeviceRecord> {
  const device = await databaseClient.device.findUnique({
    where: {
      macAddress: deviceMac
    },
    select: {
      id: true
    }
  });

  if (!device) {
    throw new Error(`Unknown device: ${deviceMac}`);
  }

  return device;
}

export function createDeviceCommandService(
  databaseClient: DeviceCommandDatabaseClient,
  dependencies: DeviceCommandServiceDependencies = {}
): DeviceCommandService {
  const generateCommandId = dependencies.generateCommandId ?? randomUUID;

  return {
    async createPendingCommand({ deviceMac, issuedAt, payload, requestedBy }) {
      const device = await requireDevice(databaseClient, deviceMac);
      const issuedAtDate = new Date(issuedAt);
      const command = await databaseClient.deviceCommand.create({
        data: {
          device: {
            connect: {
              id: device.id
            }
          },
          commandId: generateCommandId(),
          schemaVersion: 1,
          targetType: DeviceCommandTargetType.COMMAND,
          issuedAt: issuedAtDate,
          requestedBy,
          commandType: "led.set",
          payloadJson: toJsonValue(payload),
          status: DeviceCommandStatus.PENDING,
          statusUpdatedAt: issuedAtDate
        },
        include: {
          device: {
            select: {
              macAddress: true
            }
          }
        }
      });

      return toPendingCommandView(command);
    },
    async createPendingConfig({ deviceMac, issuedAt, pollingIntervalSec, requestedBy }) {
      const device = await requireDevice(databaseClient, deviceMac);
      const issuedAtDate = new Date(issuedAt);
      const command = await databaseClient.deviceCommand.create({
        data: {
          device: {
            connect: {
              id: device.id
            }
          },
          commandId: generateCommandId(),
          schemaVersion: 1,
          targetType: DeviceCommandTargetType.CONFIG,
          issuedAt: issuedAtDate,
          requestedBy,
          commandType: "polling.set",
          payloadJson: toJsonValue({
            polling_interval_sec: pollingIntervalSec
          }),
          status: DeviceCommandStatus.PENDING,
          statusUpdatedAt: issuedAtDate
        },
        include: {
          device: {
            select: {
              macAddress: true
            }
          }
        }
      });

      return toPendingCommandView(command);
    },
    async markCommandPublished(commandId, publishedAt = new Date().toISOString()) {
      await databaseClient.deviceCommand.update({
        where: {
          commandId
        },
        data: {
          publishedAt: new Date(publishedAt)
        }
      });
    },
    async listCommands(limit = 50) {
      const commands = await databaseClient.deviceCommand.findMany({
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
        take: limit
      });

      return commands.map(toPendingCommandView);
    }
  };
}
