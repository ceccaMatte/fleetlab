import { afterEach, beforeEach, describe, expect, it } from "vitest";

import mqtt, { type MqttClient } from "mqtt";
import { vi } from "vitest";

import { deviceTopics } from "../src/contracts/device-topics.ts";
import type { DevicePersistenceService } from "../src/modules/database/device-persistence.ts";
import { DeviceStateStore } from "../src/modules/devices/device-state-store.ts";
import { createMqttBroker } from "../src/modules/mqtt/mqtt-broker.ts";

async function waitFor(assertion: () => void, timeoutMs = 3000) {
  const start = Date.now();

  while (true) {
    try {
      assertion();
      return;
    } catch (error) {
      if (Date.now() - start >= timeoutMs) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
}

async function waitForMqttConnect(client: MqttClient) {
  await new Promise<void>((resolve, reject) => {
    const onConnect = () => {
      client.off("error", onError);
      resolve();
    };

    const onError = (error: Error) => {
      client.off("connect", onConnect);
      reject(error);
    };

    client.once("connect", onConnect);
    client.once("error", onError);
  });
}

describe("mqtt broker", () => {
  const deviceStateStore = new DeviceStateStore();
  let devicePersistenceService: DevicePersistenceService;
  let broker: ReturnType<typeof createMqttBroker>;
  const clients: MqttClient[] = [];

  beforeEach(() => {
    devicePersistenceService = {
      recordInboundMessage: vi.fn(async () => undefined),
      recordPresence: vi.fn(async () => undefined)
    };
    broker = createMqttBroker({
      deviceStateStore,
      devicePersistenceService
    });
  });

  afterEach(async () => {
    for (const client of clients) {
      client.end(true);
    }

    clients.length = 0;
    deviceStateStore.clear();
    vi.clearAllMocks();
    await broker.close();
  });

  it("ingests device messages, updates in-memory state and forwards them to persistence", async () => {
    const address = await broker.start({
      host: "127.0.0.1",
      port: 0
    });

    const client = mqtt.connect(`mqtt://127.0.0.1:${address.port}`, {
      clientId: "device-client-1"
    });
    clients.push(client);

    await waitForMqttConnect(client);

    client.publish(deviceTopics.status("AA:BB:CC:DD:EE:FF"), "online");
    client.publish(
      deviceTopics.hello("AA:BB:CC:DD:EE:FF"),
      JSON.stringify({
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
      })
    );
    client.publish(
      deviceTopics.telemetry("AA:BB:CC:DD:EE:FF"),
      JSON.stringify({
        schema_version: 1,
        message_id: "22222222-2222-4222-8222-222222222222",
        device_mac: "AA:BB:CC:DD:EE:FF",
        sent_at: "2026-04-14T16:31:00Z",
        temperature_c: 22.4,
        humidity_pct: 48.2
      })
    );

    await waitFor(() => {
      expect(deviceStateStore.get("AA:BB:CC:DD:EE:FF")).toMatchObject({
        deviceMac: "AA:BB:CC:DD:EE:FF",
        status: "online",
        firmwareVersion: "0.1.0",
        telemetry: {
          temperatureC: 22.4,
          humidityPct: 48.2,
          receivedAt: "2026-04-14T16:31:00Z"
        }
      });
      expect(devicePersistenceService.recordPresence).toHaveBeenCalledWith(
        "AA:BB:CC:DD:EE:FF",
        "online",
        expect.any(String)
      );
      expect(devicePersistenceService.recordInboundMessage).toHaveBeenCalledTimes(2);
    });
    expect(devicePersistenceService.recordInboundMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        kind: "hello",
        deviceMac: "AA:BB:CC:DD:EE:FF"
      })
    );
    expect(devicePersistenceService.recordInboundMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        kind: "telemetry",
        deviceMac: "AA:BB:CC:DD:EE:FF"
      })
    );

    client.publish(deviceTopics.status("AA:BB:CC:DD:EE:FF"), "offline");

    await waitFor(() => {
      expect(deviceStateStore.get("AA:BB:CC:DD:EE:FF")?.status).toBe("offline");
      expect(devicePersistenceService.recordPresence).toHaveBeenCalledWith(
        "AA:BB:CC:DD:EE:FF",
        "offline",
        expect.any(String)
      );
    });
  });

  it("marks the device offline in persistence when the client disconnects", async () => {
    const address = await broker.start({
      host: "127.0.0.1",
      port: 0
    });

    const client = mqtt.connect(`mqtt://127.0.0.1:${address.port}`, {
      clientId: "device-client-disconnect"
    });
    clients.push(client);

    await waitForMqttConnect(client);

    client.publish(deviceTopics.status("AA:BB:CC:DD:EE:01"), "online");

    await waitFor(() => {
      expect(deviceStateStore.get("AA:BB:CC:DD:EE:01")?.status).toBe("online");
      expect(devicePersistenceService.recordPresence).toHaveBeenCalledWith(
        "AA:BB:CC:DD:EE:01",
        "online",
        expect.any(String)
      );
    });

    client.end(true);

    await waitFor(() => {
      expect(deviceStateStore.get("AA:BB:CC:DD:EE:01")?.status).toBe("offline");
      expect(devicePersistenceService.recordPresence).toHaveBeenCalledWith(
        "AA:BB:CC:DD:EE:01",
        "offline",
        expect.any(String)
      );
    });
  });
});
