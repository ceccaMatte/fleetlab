import { describe, expect, it } from "vitest";

import {
  ackMessageSchema,
  commandMessageSchema,
  configMessageSchema,
  heartbeatMessageSchema,
  helloMessageSchema,
  notificationMessageSchema,
  statusMessageSchema,
  telemetryMessageSchema
} from "../src/contracts/device-messages.ts";

const baseMessage = {
  schema_version: 1 as const,
  message_id: "11111111-1111-4111-8111-111111111111",
  device_mac: "AA:BB:CC:DD:EE:FF",
  sent_at: "2026-04-14T16:30:00Z"
};

describe("device message schemas", () => {
  it("accepts valid hello, telemetry, notification and heartbeat payloads", () => {
    expect(
      helloMessageSchema.parse({
        ...baseMessage,
        firmware_version: "0.1.0",
        capabilities: {
          temperature: true,
          humidity: true,
          rgb_led: true,
          notifications: true,
          polling_config: true
        }
      })
    ).toBeTruthy();

    expect(
      telemetryMessageSchema.parse({
        ...baseMessage,
        temperature_c: 22.4,
        humidity_pct: 48.2
      })
    ).toBeTruthy();

    expect(
      notificationMessageSchema.parse({
        ...baseMessage,
        kind: "generic",
        message: "Water tank low"
      })
    ).toBeTruthy();

    expect(
      heartbeatMessageSchema.parse({
        ...baseMessage,
        uptime_ms: 123456,
        wifi_rssi: -61
      })
    ).toBeTruthy();
  });

  it("accepts valid command, config and ack payloads", () => {
    expect(
      commandMessageSchema.parse({
        schema_version: 1,
        command_id: "22222222-2222-4222-8222-222222222222",
        device_mac: "AA:BB:CC:DD:EE:FF",
        issued_at: "2026-04-14T16:30:00Z",
        type: "led.set",
        payload: {
          power: true,
          color_rgb: { r: 255, g: 120, b: 0 },
          brightness: 80
        }
      })
    ).toBeTruthy();

    expect(
      configMessageSchema.parse({
        schema_version: 1,
        config_id: "33333333-3333-4333-8333-333333333333",
        device_mac: "AA:BB:CC:DD:EE:FF",
        issued_at: "2026-04-14T16:30:00Z",
        polling_interval_sec: 30
      })
    ).toBeTruthy();

    expect(
      ackMessageSchema.parse({
        ...baseMessage,
        target_type: "command",
        target_id: "22222222-2222-4222-8222-222222222222",
        status: "confirmed",
        result: {
          applied_state: {
            power: true,
            color_rgb: { r: 255, g: 120, b: 0 },
            brightness: 80
          }
        }
      })
    ).toBeTruthy();
  });

  it("accepts only valid online status values", () => {
    expect(statusMessageSchema.parse("online")).toBe("online");
    expect(statusMessageSchema.parse("offline")).toBe("offline");
    expect(() => statusMessageSchema.parse("pending")).toThrow();
  });

  it("rejects invalid payloads", () => {
    expect(() =>
      telemetryMessageSchema.parse({
        ...baseMessage,
        temperature_c: 22.4,
        humidity_pct: 120
      })
    ).toThrow();

    expect(() =>
      commandMessageSchema.parse({
        schema_version: 1,
        command_id: "22222222-2222-4222-8222-222222222222",
        device_mac: "AA:BB:CC:DD:EE:FF",
        issued_at: "2026-04-14T16:30:00Z",
        type: "led.set",
        payload: {
          power: true,
          color_rgb: { r: 300, g: 120, b: 0 },
          brightness: 80
        }
      })
    ).toThrow();

    expect(() =>
      configMessageSchema.parse({
        schema_version: 1,
        config_id: "33333333-3333-4333-8333-333333333333",
        device_mac: "AA:BB:CC:DD:EE:FF",
        issued_at: "2026-04-14T16:30:00Z",
        polling_interval_sec: 0
      })
    ).toThrow();

    expect(() =>
      ackMessageSchema.parse({
        ...baseMessage,
        target_type: "command",
        target_id: "22222222-2222-4222-8222-222222222222",
        status: "done",
        result: {
          applied_state: {
            power: true,
            color_rgb: { r: 255, g: 120, b: 0 },
            brightness: 80
          }
        }
      })
    ).toThrow();
  });
});
