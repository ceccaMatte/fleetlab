import { describe, expect, it } from "vitest";

import {
  decodeInboundDeviceMessage,
  encodeCommandMessage,
  encodeConfigMessage,
  parseInboundDeviceTopic
} from "../src/contracts/device-message-codec.ts";

describe("device message codec", () => {
  it("parses supported inbound topics", () => {
    expect(parseInboundDeviceTopic("fleetlab/devices/AA:BB:CC:DD:EE:FF/hello")).toEqual({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      kind: "hello"
    });

    expect(parseInboundDeviceTopic("fleetlab/devices/AA:BB:CC:DD:EE:FF/ack")).toEqual({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      kind: "ack"
    });
  });

  it("rejects unsupported inbound topics", () => {
    expect(() =>
      parseInboundDeviceTopic("fleetlab/devices/AA:BB:CC:DD:EE:FF/command")
    ).toThrow("Unsupported inbound device topic: fleetlab/devices/AA:BB:CC:DD:EE:FF/command");
  });

  it("decodes inbound telemetry payloads using the matching schema", () => {
    const message = decodeInboundDeviceMessage(
      "fleetlab/devices/AA:BB:CC:DD:EE:FF/telemetry",
      JSON.stringify({
        schema_version: 1,
        message_id: "11111111-1111-4111-8111-111111111111",
        device_mac: "AA:BB:CC:DD:EE:FF",
        sent_at: "2026-04-14T16:30:00Z",
        temperature_c: 22.4,
        humidity_pct: 48.2
      })
    );

    expect(message.kind).toBe("telemetry");
    expect(message.deviceMac).toBe("AA:BB:CC:DD:EE:FF");

    if (message.kind === "telemetry") {
      expect(message.payload.temperature_c).toBe(22.4);
      expect(message.payload.humidity_pct).toBe(48.2);
    }
  });

  it("rejects invalid JSON or invalid payloads", () => {
    expect(() =>
      decodeInboundDeviceMessage("fleetlab/devices/AA:BB:CC:DD:EE:FF/hello", "{invalid")
    ).toThrow("Invalid JSON payload");

    expect(() =>
      decodeInboundDeviceMessage(
        "fleetlab/devices/AA:BB:CC:DD:EE:FF/telemetry",
        JSON.stringify({
          schema_version: 1,
          message_id: "11111111-1111-4111-8111-111111111111",
          device_mac: "AA:BB:CC:DD:EE:FF",
          sent_at: "2026-04-14T16:30:00Z",
          temperature_c: 22.4,
          humidity_pct: 120
        })
      )
    ).toThrow();
  });

  it("encodes validated outbound command and config messages", () => {
    expect(
      JSON.parse(
        encodeCommandMessage({
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
      )
    ).toMatchObject({
      type: "led.set"
    });

    expect(
      JSON.parse(
        encodeConfigMessage({
          schema_version: 1,
          config_id: "33333333-3333-4333-8333-333333333333",
          device_mac: "AA:BB:CC:DD:EE:FF",
          issued_at: "2026-04-14T16:30:00Z",
          polling_interval_sec: 30
        })
      )
    ).toMatchObject({
      polling_interval_sec: 30
    });
  });
});
