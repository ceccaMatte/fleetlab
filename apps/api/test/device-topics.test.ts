import { describe, expect, it } from "vitest";

import { deviceTopics, normalizeDeviceMac, parseDeviceStatusTopic } from "../src/contracts/device-topics.ts";

describe("device topics", () => {
  it("normalizes MAC addresses before building topics", () => {
    expect(normalizeDeviceMac("aa:bb:cc:dd:ee:ff")).toBe("AA:BB:CC:DD:EE:FF");
    expect(deviceTopics.telemetry("aa:bb:cc:dd:ee:ff")).toBe(
      "fleetlab/devices/AA:BB:CC:DD:EE:FF/telemetry"
    );
  });

  it("builds all V1 topics from the same MAC", () => {
    const deviceMac = "AA:BB:CC:DD:EE:FF";

    expect(deviceTopics.hello(deviceMac)).toBe("fleetlab/devices/AA:BB:CC:DD:EE:FF/hello");
    expect(deviceTopics.notification(deviceMac)).toBe(
      "fleetlab/devices/AA:BB:CC:DD:EE:FF/notification"
    );
    expect(deviceTopics.ack(deviceMac)).toBe("fleetlab/devices/AA:BB:CC:DD:EE:FF/ack");
    expect(deviceTopics.heartbeat(deviceMac)).toBe(
      "fleetlab/devices/AA:BB:CC:DD:EE:FF/heartbeat"
    );
    expect(deviceTopics.command(deviceMac)).toBe("fleetlab/devices/AA:BB:CC:DD:EE:FF/command");
    expect(deviceTopics.config(deviceMac)).toBe("fleetlab/devices/AA:BB:CC:DD:EE:FF/config");
    expect(deviceTopics.status(deviceMac)).toBe("fleetlab/devices/AA:BB:CC:DD:EE:FF/status");
  });

  it("rejects invalid MAC addresses", () => {
    expect(() => normalizeDeviceMac("not-a-mac")).toThrow("Invalid device MAC address: not-a-mac");
    expect(() => deviceTopics.hello("AA-BB-CC-DD-EE-FF")).toThrow(
      "Invalid device MAC address: AA-BB-CC-DD-EE-FF"
    );
  });

  it("parses valid status topics and rejects invalid ones", () => {
    expect(parseDeviceStatusTopic("fleetlab/devices/AA:BB:CC:DD:EE:FF/status")).toBe(
      "AA:BB:CC:DD:EE:FF"
    );
    expect(() => parseDeviceStatusTopic("fleetlab/devices/AA:BB:CC:DD:EE:FF/hello")).toThrow(
      "Unsupported device status topic: fleetlab/devices/AA:BB:CC:DD:EE:FF/hello"
    );
  });
});
