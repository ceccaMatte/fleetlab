import type {
  AckMessage,
  CommandMessage,
  ConfigMessage,
  HeartbeatMessage,
  HelloMessage,
  NotificationMessage,
  TelemetryMessage
} from "./device-messages.ts";
import {
  ackMessageSchema,
  commandMessageSchema,
  configMessageSchema,
  heartbeatMessageSchema,
  helloMessageSchema,
  notificationMessageSchema,
  telemetryMessageSchema
} from "./device-messages.ts";
import { normalizeDeviceMac } from "./device-topics.ts";

const inboundTopicPattern =
  /^fleetlab\/devices\/(?<deviceMac>(?:[0-9A-F]{2}:){5}[0-9A-F]{2})\/(?<kind>hello|telemetry|notification|ack|heartbeat)$/;

export type InboundDeviceMessageKind =
  | "hello"
  | "telemetry"
  | "notification"
  | "ack"
  | "heartbeat";

export type InboundDeviceMessage =
  | { kind: "hello"; topic: string; deviceMac: string; payload: HelloMessage }
  | { kind: "telemetry"; topic: string; deviceMac: string; payload: TelemetryMessage }
  | { kind: "notification"; topic: string; deviceMac: string; payload: NotificationMessage }
  | { kind: "ack"; topic: string; deviceMac: string; payload: AckMessage }
  | { kind: "heartbeat"; topic: string; deviceMac: string; payload: HeartbeatMessage };

export function parseInboundDeviceTopic(topic: string): {
  deviceMac: string;
  kind: InboundDeviceMessageKind;
} {
  const match = inboundTopicPattern.exec(topic);

  if (!match?.groups) {
    throw new Error(`Unsupported inbound device topic: ${topic}`);
  }

  return {
    deviceMac: normalizeDeviceMac(match.groups.deviceMac),
    kind: match.groups.kind as InboundDeviceMessageKind
  };
}

function parseJsonPayload(payload: string) {
  try {
    return JSON.parse(payload) as unknown;
  } catch {
    throw new Error("Invalid JSON payload");
  }
}

export function decodeInboundDeviceMessage(topic: string, payload: string): InboundDeviceMessage {
  const { deviceMac, kind } = parseInboundDeviceTopic(topic);
  const parsedPayload = parseJsonPayload(payload);

  switch (kind) {
    case "hello":
      return {
        kind,
        topic,
        deviceMac,
        payload: helloMessageSchema.parse(parsedPayload)
      };
    case "telemetry":
      return {
        kind,
        topic,
        deviceMac,
        payload: telemetryMessageSchema.parse(parsedPayload)
      };
    case "notification":
      return {
        kind,
        topic,
        deviceMac,
        payload: notificationMessageSchema.parse(parsedPayload)
      };
    case "ack":
      return {
        kind,
        topic,
        deviceMac,
        payload: ackMessageSchema.parse(parsedPayload)
      };
    case "heartbeat":
      return {
        kind,
        topic,
        deviceMac,
        payload: heartbeatMessageSchema.parse(parsedPayload)
      };
  }
}

export function encodeCommandMessage(payload: CommandMessage): string {
  return JSON.stringify(commandMessageSchema.parse(payload));
}

export function encodeConfigMessage(payload: ConfigMessage): string {
  return JSON.stringify(configMessageSchema.parse(payload));
}
