import aedesPackage from "aedes";
import type { Client, PublishPacket } from "aedes";
import { createServer, type AddressInfo, type Server } from "node:net";

import { decodeInboundDeviceMessage } from "../../contracts/device-message-codec.ts";
import { statusMessageSchema } from "../../contracts/device-messages.ts";
import { parseDeviceStatusTopic } from "../../contracts/device-topics.ts";
import type { DevicePersistenceService } from "../database/device-persistence.ts";
import type { DeviceStateStore } from "../devices/device-state-store.ts";

export interface MqttBrokerStartOptions {
  host: string;
  port: number;
}

export interface MqttBroker {
  start(options: MqttBrokerStartOptions): Promise<{ host: string; port: number }>;
  publish(topic: string, payload: string): Promise<void>;
  close(): Promise<void>;
}

interface CreateMqttBrokerOptions {
  deviceStateStore: DeviceStateStore;
  devicePersistenceService: DevicePersistenceService;
  onPersistenceError?: (error: unknown) => void;
}

export function createMqttBroker({
  deviceStateStore,
  devicePersistenceService,
  onPersistenceError
}: CreateMqttBrokerOptions): MqttBroker {
  const { createBroker } = aedesPackage as unknown as {
    createBroker: typeof import("aedes").createBroker;
  };
  const broker = createBroker();
  const clientDevices = new Map<string, string>();
  let server: Server | undefined;
  let started = false;
  const reportPersistenceError = onPersistenceError ?? (() => undefined);

  const runPersistence = (operation: Promise<void>) => {
    void operation.catch((error) => {
      reportPersistenceError(error);
    });
  };

  const handlePublish = (packet: PublishPacket, client?: Client | null) => {
    if (!client || !packet.topic) {
      return;
    }

    const payload = packet.payload.toString("utf8");

    if (packet.topic.endsWith("/status")) {
      const deviceMac = parseDeviceStatusTopic(packet.topic);
      const status = statusMessageSchema.parse(payload);
      const observedAt = new Date().toISOString();

      deviceStateStore.applyPresence(deviceMac, status, observedAt);
      runPersistence(devicePersistenceService.recordPresence(deviceMac, status, observedAt));
      clientDevices.set(client.id, deviceMac);

      return;
    }

    const message = decodeInboundDeviceMessage(packet.topic, payload);

    deviceStateStore.applyInboundMessage(message);
    runPersistence(devicePersistenceService.recordInboundMessage(message));
    clientDevices.set(client.id, message.deviceMac);
  };

  const handleClientDisconnect = (client: Client) => {
    const deviceMac = clientDevices.get(client.id);

    if (!deviceMac) {
      return;
    }

    const observedAt = new Date().toISOString();

    deviceStateStore.applyPresence(deviceMac, "offline", observedAt);
    runPersistence(devicePersistenceService.recordPresence(deviceMac, "offline", observedAt));
    clientDevices.delete(client.id);
  };

  broker.on("publish", handlePublish);
  broker.on("clientDisconnect", handleClientDisconnect);

  return {
    async start({ host, port }) {
      if (started && server) {
        const address = server.address();

        if (address && typeof address !== "string") {
          return {
            host: address.address,
            port: address.port
          };
        }
      }

      server = createServer(broker.handle.bind(broker));

      await new Promise<void>((resolve, reject) => {
        server!.once("error", reject);
        server!.listen(port, host, () => {
          server!.off("error", reject);
          resolve();
        });
      });

      started = true;

      const address = server.address() as AddressInfo;

      return {
        host: address.address,
        port: address.port
      };
    },
    async publish(topic, payload) {
      if (!started) {
        throw new Error("MQTT broker is not started");
      }

      await new Promise<void>((resolve, reject) => {
        broker.publish(
          {
            cmd: "publish",
            dup: false,
            topic,
            payload: Buffer.from(payload, "utf8"),
            qos: 0,
            retain: false
          },
          (error?: Error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          }
        );
      });
    },
    async close() {
      const closeServer = async () => {
        if (!server || !started) {
          return;
        }

        await new Promise<void>((resolve, reject) => {
          server!.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });

        started = false;
        server = undefined;
      };

      broker.off("publish", handlePublish);
      broker.off("clientDisconnect", handleClientDisconnect);

      await closeServer();
      await broker.close();
    }
  };
}
