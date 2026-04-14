import type { InboundDeviceMessage } from "../../contracts/device-message-codec.ts";

export interface DeviceLedState {
  power: boolean;
  colorRgb: {
    r: number;
    g: number;
    b: number;
  };
  brightness: number;
}

export interface DeviceTelemetrySnapshot {
  temperatureC: number;
  humidityPct: number;
  receivedAt: string;
}

export interface DeviceCapabilitiesSnapshot {
  temperature: boolean;
  humidity: boolean;
  rgbLed: boolean;
  notifications: boolean;
  pollingConfig: boolean;
}

export interface DeviceStateProjection {
  deviceMac: string;
  status: "online" | "offline";
  firstSeenAt: string;
  lastSeenAt: string;
  lastMessageKind?: InboundDeviceMessage["kind"];
  firmwareVersion?: string;
  capabilities?: DeviceCapabilitiesSnapshot;
  telemetry?: DeviceTelemetrySnapshot;
  lastNotificationAt?: string;
  lastCommandAckAt?: string;
  lastConfigAckAt?: string;
  ledState?: DeviceLedState;
}

function toLedState(payload: InboundDeviceMessage & { kind: "ack" }): DeviceLedState {
  return {
    power: payload.payload.result.applied_state.power,
    colorRgb: {
      r: payload.payload.result.applied_state.color_rgb.r,
      g: payload.payload.result.applied_state.color_rgb.g,
      b: payload.payload.result.applied_state.color_rgb.b
    },
    brightness: payload.payload.result.applied_state.brightness
  };
}

export function applyInboundDeviceMessage(
  current: DeviceStateProjection | undefined,
  message: InboundDeviceMessage
): DeviceStateProjection {
  const baseState: DeviceStateProjection =
    current ??
    ({
      deviceMac: message.deviceMac,
      status: "online",
      firstSeenAt: message.payload.sent_at,
      lastSeenAt: message.payload.sent_at,
      lastMessageKind: message.kind
    } satisfies DeviceStateProjection);

  const nextState: DeviceStateProjection = {
    ...baseState,
    deviceMac: message.deviceMac,
    status: "online",
    lastSeenAt: message.payload.sent_at,
    lastMessageKind: message.kind
  };

  switch (message.kind) {
    case "hello":
      return {
        ...nextState,
        firmwareVersion: message.payload.firmware_version,
        capabilities: {
          temperature: message.payload.capabilities.temperature,
          humidity: message.payload.capabilities.humidity,
          rgbLed: message.payload.capabilities.rgb_led,
          notifications: message.payload.capabilities.notifications,
          pollingConfig: message.payload.capabilities.polling_config
        }
      };
    case "telemetry":
      return {
        ...nextState,
        telemetry: {
          temperatureC: message.payload.temperature_c,
          humidityPct: message.payload.humidity_pct,
          receivedAt: message.payload.sent_at
        }
      };
    case "notification":
      return {
        ...nextState,
        lastNotificationAt: message.payload.sent_at
      };
    case "ack":
      return {
        ...nextState,
        lastCommandAckAt:
          message.payload.target_type === "command"
            ? message.payload.sent_at
            : nextState.lastCommandAckAt,
        lastConfigAckAt:
          message.payload.target_type === "config" ? message.payload.sent_at : nextState.lastConfigAckAt,
        ledState: message.payload.target_type === "command" ? toLedState(message) : nextState.ledState
      };
    case "heartbeat":
      return nextState;
  }
}

export function markDeviceOffline(
  current: DeviceStateProjection,
  observedAt: string
): DeviceStateProjection {
  return {
    ...current,
    status: "offline",
    lastSeenAt: observedAt
  };
}

export function markDeviceOnline(
  current: DeviceStateProjection | undefined,
  deviceMac: string,
  observedAt: string
): DeviceStateProjection {
  if (!current) {
    return {
      deviceMac,
      status: "online",
      firstSeenAt: observedAt,
      lastSeenAt: observedAt
    };
  }

  return {
    ...current,
    status: "online",
    lastSeenAt: observedAt
  };
}
