import {
  encodeCommandMessage,
  encodeConfigMessage
} from "../../contracts/device-message-codec.ts";
import { deviceTopics } from "../../contracts/device-topics.ts";
import type {
  CreatePendingCommandInput,
  CreatePendingConfigInput,
  DeviceCommandService,
  PendingCommandView
} from "../database/device-command-service.ts";
import type { MqttBroker } from "../mqtt/mqtt-broker.ts";

export interface DeviceCommandDispatchService {
  dispatchCommand(input: CreatePendingCommandInput): Promise<PendingCommandView>;
  dispatchConfig(input: CreatePendingConfigInput): Promise<PendingCommandView>;
}

export function createDeviceCommandDispatchService(
  deviceCommandService: DeviceCommandService,
  mqttBroker: Pick<MqttBroker, "publish">
): DeviceCommandDispatchService {
  return {
    async dispatchCommand(input) {
      const pendingCommand = await deviceCommandService.createPendingCommand(input);
      const publishedAt = new Date().toISOString();

      await mqttBroker.publish(
        deviceTopics.command(pendingCommand.deviceMac),
        encodeCommandMessage({
          schema_version: 1,
          command_id: pendingCommand.commandId,
          device_mac: pendingCommand.deviceMac,
          issued_at: pendingCommand.issuedAt,
          type: "led.set",
          payload: pendingCommand.payload as CreatePendingCommandInput["payload"]
        })
      );
      await deviceCommandService.markCommandPublished(pendingCommand.commandId, publishedAt);

      return {
        ...pendingCommand,
        publishedAt
      };
    },
    async dispatchConfig(input) {
      const pendingConfig = await deviceCommandService.createPendingConfig(input);
      const publishedAt = new Date().toISOString();
      const payload = pendingConfig.payload as {
        polling_interval_sec: number;
      };

      await mqttBroker.publish(
        deviceTopics.config(pendingConfig.deviceMac),
        encodeConfigMessage({
          schema_version: 1,
          config_id: pendingConfig.commandId,
          device_mac: pendingConfig.deviceMac,
          issued_at: pendingConfig.issuedAt,
          polling_interval_sec: payload.polling_interval_sec
        })
      );
      await deviceCommandService.markCommandPublished(pendingConfig.commandId, publishedAt);

      return {
        ...pendingConfig,
        publishedAt
      };
    }
  };
}
