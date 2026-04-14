import type { InboundDeviceMessage } from "../../contracts/device-message-codec.ts";
import { normalizeDeviceMac } from "../../contracts/device-topics.ts";
import {
  applyInboundDeviceMessage,
  markDeviceOffline,
  markDeviceOnline,
  type DeviceStateProjection
} from "./device-state-projection.ts";

export class DeviceStateStore {
  readonly #states = new Map<string, DeviceStateProjection>();

  applyInboundMessage(message: InboundDeviceMessage) {
    const deviceMac = normalizeDeviceMac(message.deviceMac);
    const nextState = applyInboundDeviceMessage(this.#states.get(deviceMac), {
      ...message,
      deviceMac
    });

    this.#states.set(deviceMac, nextState);

    return nextState;
  }

  applyPresence(deviceMac: string, status: "online" | "offline", observedAt: string) {
    const normalizedMac = normalizeDeviceMac(deviceMac);
    const current = this.#states.get(normalizedMac);

    const nextState =
      status === "online"
        ? markDeviceOnline(current, normalizedMac, observedAt)
        : current
          ? markDeviceOffline(current, observedAt)
          : {
              deviceMac: normalizedMac,
              status: "offline" as const,
              firstSeenAt: observedAt,
              lastSeenAt: observedAt
            };

    this.#states.set(normalizedMac, nextState);

    return nextState;
  }

  get(deviceMac: string) {
    return this.#states.get(normalizeDeviceMac(deviceMac));
  }

  clear() {
    this.#states.clear();
  }

  list() {
    return [...this.#states.values()].sort((left, right) => left.deviceMac.localeCompare(right.deviceMac));
  }
}
