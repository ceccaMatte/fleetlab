import { describe, expect, it, vi } from "vitest";

import {
  createDeviceCommandDispatchService
} from "../src/modules/commands/device-command-dispatch-service.ts";
import type {
  DeviceCommandService,
  PendingCommandView
} from "../src/modules/database/device-command-service.ts";

function createPendingView(overrides: Partial<PendingCommandView> = {}): PendingCommandView {
  return {
    commandId: "11111111-1111-4111-8111-111111111111",
    deviceMac: "AA:BB:CC:DD:EE:FF",
    schemaVersion: 1,
    targetType: "command",
    commandType: "led.set",
    status: "pending",
    issuedAt: "2026-04-15T11:00:00.000Z",
    statusUpdatedAt: "2026-04-15T11:00:00.000Z",
    publishedAt: undefined,
    confirmedAt: undefined,
    failedAt: undefined,
    failureReason: undefined,
    requestedBy: "dashboard",
    payload: {
      power: true,
      color_rgb: {
        r: 255,
        g: 120,
        b: 0
      },
      brightness: 80
    },
    ...overrides
  };
}

function createCommandServiceMock() {
  return {
    createPendingCommand: vi.fn(async () => createPendingView()),
    createPendingConfig: vi.fn(async () =>
      createPendingView({
        commandId: "22222222-2222-4222-8222-222222222222",
        targetType: "config",
        commandType: "polling.set",
        payload: {
          polling_interval_sec: 30
        }
      })
    ),
    markCommandPublished: vi.fn(async () => undefined),
    listCommands: vi.fn(async () => [])
  } satisfies DeviceCommandService;
}

describe("device command dispatch service", () => {
  it("persists a pending command, publishes it over MQTT and records publishedAt", async () => {
    const deviceCommandService = createCommandServiceMock();
    const mqttBroker = {
      publish: vi.fn(async () => undefined)
    };
    const service = createDeviceCommandDispatchService(deviceCommandService, mqttBroker);

    const item = await service.dispatchCommand({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      issuedAt: "2026-04-15T11:00:00.000Z",
      requestedBy: "dashboard",
      payload: {
        power: true,
        color_rgb: {
          r: 255,
          g: 120,
          b: 0
        },
        brightness: 80
      }
    });

    expect(deviceCommandService.createPendingCommand).toHaveBeenCalledWith({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      issuedAt: "2026-04-15T11:00:00.000Z",
      requestedBy: "dashboard",
      payload: {
        power: true,
        color_rgb: {
          r: 255,
          g: 120,
          b: 0
        },
        brightness: 80
      }
    });
    expect(mqttBroker.publish).toHaveBeenCalledWith(
      "fleetlab/devices/AA:BB:CC:DD:EE:FF/command",
      JSON.stringify({
        schema_version: 1,
        command_id: "11111111-1111-4111-8111-111111111111",
        device_mac: "AA:BB:CC:DD:EE:FF",
        issued_at: "2026-04-15T11:00:00.000Z",
        type: "led.set",
        payload: {
          power: true,
          color_rgb: {
            r: 255,
            g: 120,
            b: 0
          },
          brightness: 80
        }
      })
    );
    expect(deviceCommandService.markCommandPublished).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
      expect.any(String)
    );
    expect(item).toMatchObject({
      commandId: "11111111-1111-4111-8111-111111111111",
      targetType: "command",
      status: "pending"
    });
    expect(item.publishedAt).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
    );
    expect(
      vi.mocked(deviceCommandService.createPendingCommand).mock.invocationCallOrder[0]
    ).toBeLessThan(vi.mocked(mqttBroker.publish).mock.invocationCallOrder[0]);
    expect(
      vi.mocked(mqttBroker.publish).mock.invocationCallOrder[0]
    ).toBeLessThan(
      vi.mocked(deviceCommandService.markCommandPublished).mock.invocationCallOrder[0]
    );
  });

  it("publishes config updates on the dedicated MQTT topic", async () => {
    const deviceCommandService = createCommandServiceMock();
    const mqttBroker = {
      publish: vi.fn(async () => undefined)
    };
    const service = createDeviceCommandDispatchService(deviceCommandService, mqttBroker);

    const item = await service.dispatchConfig({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      issuedAt: "2026-04-15T11:05:00.000Z",
      pollingIntervalSec: 30
    });

    expect(deviceCommandService.createPendingConfig).toHaveBeenCalledWith({
      deviceMac: "AA:BB:CC:DD:EE:FF",
      issuedAt: "2026-04-15T11:05:00.000Z",
      pollingIntervalSec: 30
    });
    expect(mqttBroker.publish).toHaveBeenCalledWith(
      "fleetlab/devices/AA:BB:CC:DD:EE:FF/config",
      JSON.stringify({
        schema_version: 1,
        config_id: "22222222-2222-4222-8222-222222222222",
        device_mac: "AA:BB:CC:DD:EE:FF",
        issued_at: "2026-04-15T11:00:00.000Z",
        polling_interval_sec: 30
      })
    );
    expect(deviceCommandService.markCommandPublished).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222222",
      expect.any(String)
    );
    expect(item).toMatchObject({
      commandId: "22222222-2222-4222-8222-222222222222",
      targetType: "config",
      status: "pending"
    });
  });

  it("does not mark the command as published when MQTT publish fails", async () => {
    const deviceCommandService = createCommandServiceMock();
    const mqttBroker = {
      publish: vi.fn(async () => {
        throw new Error("publish failed");
      })
    };
    const service = createDeviceCommandDispatchService(deviceCommandService, mqttBroker);

    await expect(
      service.dispatchCommand({
        deviceMac: "AA:BB:CC:DD:EE:FF",
        issuedAt: "2026-04-15T11:00:00.000Z",
        payload: {
          power: true,
          color_rgb: {
            r: 255,
            g: 120,
            b: 0
          },
          brightness: 80
        }
      })
    ).rejects.toThrow("publish failed");

    expect(deviceCommandService.markCommandPublished).not.toHaveBeenCalled();
  });
});
