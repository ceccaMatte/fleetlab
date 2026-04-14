import { afterEach, describe, expect, it } from "vitest";

import mqtt, { type MqttClient } from "mqtt";

import { deviceTopics } from "../src/contracts/device-topics.ts";
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
  const broker = createMqttBroker({ deviceStateStore });
  const clients: MqttClient[] = [];

  afterEach(async () => {
    for (const client of clients) {
      client.end(true);
    }

    clients.length = 0;
    deviceStateStore.clear();
    await broker.close();
  });

  it("ingests device messages and presence updates through MQTT", async () => {
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
    });

    client.publish(deviceTopics.status("AA:BB:CC:DD:EE:FF"), "offline");

    await waitFor(() => {
      expect(deviceStateStore.get("AA:BB:CC:DD:EE:FF")?.status).toBe("offline");
    });
  });
});
