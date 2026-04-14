import { describe, expect, it } from "vitest";

import { applyInboundDeviceMessage, markDeviceOffline } from "../src/modules/devices/device-state-projection.ts";

describe("device state projection", () => {
  it("creates projection state from a hello message", () => {
    const projection = applyInboundDeviceMessage(undefined, {
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
    });

    expect(projection).toMatchObject({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      status: "online",
      firstSeenAt: "2026-04-14T16:30:00Z",
      lastSeenAt: "2026-04-14T16:30:00Z",
      firmwareVersion: "0.1.0",
      lastMessageKind: "hello"
    });
  });

  it("updates telemetry and heartbeat without losing prior state", () => {
    const fromHello = applyInboundDeviceMessage(undefined, {
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
    });

    const fromTelemetry = applyInboundDeviceMessage(fromHello, {
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

    const fromHeartbeat = applyInboundDeviceMessage(fromTelemetry, {
      kind: "heartbeat",
      topic: "fleetlab/devices/AA:BB:CC:DD:EE:FF/heartbeat",
      deviceMac: "AA:BB:CC:DD:EE:FF",
      payload: {
        schema_version: 1,
        message_id: "33333333-3333-4333-8333-333333333333",
        device_mac: "AA:BB:CC:DD:EE:FF",
        sent_at: "2026-04-14T16:32:00Z",
        uptime_ms: 123456,
        wifi_rssi: -61
      }
    });

    expect(fromHeartbeat.telemetry).toEqual({
      temperatureC: 22.4,
      humidityPct: 48.2,
      receivedAt: "2026-04-14T16:31:00Z"
    });
    expect(fromHeartbeat.lastSeenAt).toBe("2026-04-14T16:32:00Z");
    expect(fromHeartbeat.lastMessageKind).toBe("heartbeat");
    expect(fromHeartbeat.firmwareVersion).toBe("0.1.0");
  });

  it("tracks notification timestamps and command acknowledgements", () => {
    const fromNotification = applyInboundDeviceMessage(undefined, {
      kind: "notification",
      topic: "fleetlab/devices/AA:BB:CC:DD:EE:FF/notification",
      deviceMac: "AA:BB:CC:DD:EE:FF",
      payload: {
        schema_version: 1,
        message_id: "44444444-4444-4444-8444-444444444444",
        device_mac: "AA:BB:CC:DD:EE:FF",
        sent_at: "2026-04-14T16:33:00Z",
        kind: "generic",
        message: "Water tank low"
      }
    });

    const fromAck = applyInboundDeviceMessage(fromNotification, {
      kind: "ack",
      topic: "fleetlab/devices/AA:BB:CC:DD:EE:FF/ack",
      deviceMac: "AA:BB:CC:DD:EE:FF",
      payload: {
        schema_version: 1,
        message_id: "55555555-5555-4555-8555-555555555555",
        device_mac: "AA:BB:CC:DD:EE:FF",
        sent_at: "2026-04-14T16:34:00Z",
        target_type: "command",
        target_id: "66666666-6666-4666-8666-666666666666",
        status: "confirmed",
        result: {
          applied_state: {
            power: true,
            color_rgb: { r: 255, g: 120, b: 0 },
            brightness: 80
          }
        }
      }
    });

    expect(fromAck.lastNotificationAt).toBe("2026-04-14T16:33:00Z");
    expect(fromAck.lastCommandAckAt).toBe("2026-04-14T16:34:00Z");
    expect(fromAck.ledState).toEqual({
      power: true,
      colorRgb: { r: 255, g: 120, b: 0 },
      brightness: 80
    });
  });

  it("marks the device offline without discarding known state", () => {
    const onlineProjection = applyInboundDeviceMessage(undefined, {
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
    });

    const offlineProjection = markDeviceOffline(onlineProjection, "2026-04-14T16:40:00Z");

    expect(offlineProjection.status).toBe("offline");
    expect(offlineProjection.lastSeenAt).toBe("2026-04-14T16:40:00Z");
    expect(offlineProjection.firmwareVersion).toBe("0.1.0");
  });
});
