import { describe, expect, it } from "vitest";

import { DeviceStateStore } from "../src/modules/devices/device-state-store.ts";

describe("device state store", () => {
  it("applies inbound messages and returns sorted device state", () => {
    const store = new DeviceStateStore();

    store.applyInboundMessage({
      kind: "hello",
      topic: "fleetlab/devices/BB:BB:BB:BB:BB:BB/hello",
      deviceMac: "BB:BB:BB:BB:BB:BB",
      payload: {
        schema_version: 1,
        message_id: "11111111-1111-4111-8111-111111111111",
        device_mac: "BB:BB:BB:BB:BB:BB",
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

    store.applyPresence("AA:AA:AA:AA:AA:AA", "online", "2026-04-14T16:29:00Z");

    expect(store.list().map((item) => item.deviceMac)).toEqual([
      "AA:AA:AA:AA:AA:AA",
      "BB:BB:BB:BB:BB:BB"
    ]);
  });

  it("updates presence for known devices", () => {
    const store = new DeviceStateStore();

    store.applyPresence("AA:BB:CC:DD:EE:FF", "online", "2026-04-14T16:30:00Z");
    store.applyPresence("AA:BB:CC:DD:EE:FF", "offline", "2026-04-14T16:31:00Z");

    expect(store.get("AA:BB:CC:DD:EE:FF")).toMatchObject({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      status: "offline",
      firstSeenAt: "2026-04-14T16:30:00Z",
      lastSeenAt: "2026-04-14T16:31:00Z"
    });
  });
});
