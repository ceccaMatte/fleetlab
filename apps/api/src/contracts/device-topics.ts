const DEVICE_MAC_PATTERN = /^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/;
const BASE_TOPIC = "fleetlab/devices";

export const deviceStatusValues = ["online", "offline"] as const;

export type DeviceStatusValue = (typeof deviceStatusValues)[number];

export function normalizeDeviceMac(deviceMac: string): string {
  const normalized = deviceMac.trim().toUpperCase();

  if (!DEVICE_MAC_PATTERN.test(normalized)) {
    throw new Error(`Invalid device MAC address: ${deviceMac}`);
  }

  return normalized;
}

function buildDeviceTopic(deviceMac: string, suffix: string) {
  return `${BASE_TOPIC}/${normalizeDeviceMac(deviceMac)}/${suffix}`;
}

export function parseDeviceStatusTopic(topic: string): string {
  const match = /^fleetlab\/devices\/(?<deviceMac>(?:[0-9A-F]{2}:){5}[0-9A-F]{2})\/status$/.exec(
    topic
  );

  if (!match?.groups?.deviceMac) {
    throw new Error(`Unsupported device status topic: ${topic}`);
  }

  return normalizeDeviceMac(match.groups.deviceMac);
}

export const deviceTopics = {
  hello(deviceMac: string) {
    return buildDeviceTopic(deviceMac, "hello");
  },
  telemetry(deviceMac: string) {
    return buildDeviceTopic(deviceMac, "telemetry");
  },
  notification(deviceMac: string) {
    return buildDeviceTopic(deviceMac, "notification");
  },
  ack(deviceMac: string) {
    return buildDeviceTopic(deviceMac, "ack");
  },
  heartbeat(deviceMac: string) {
    return buildDeviceTopic(deviceMac, "heartbeat");
  },
  command(deviceMac: string) {
    return buildDeviceTopic(deviceMac, "command");
  },
  config(deviceMac: string) {
    return buildDeviceTopic(deviceMac, "config");
  },
  status(deviceMac: string) {
    return buildDeviceTopic(deviceMac, "status");
  }
};
