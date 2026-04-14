import { z } from "zod";

const rgbColorSchema = z.object({
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255)
});

const baseDeviceMessageSchema = z.object({
  schema_version: z.literal(1),
  message_id: z.uuid(),
  device_mac: z.string().regex(/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/),
  sent_at: z.iso.datetime()
});

export const helloMessageSchema = baseDeviceMessageSchema.extend({
  firmware_version: z.string().min(1),
  capabilities: z.object({
    temperature: z.boolean(),
    humidity: z.boolean(),
    rgb_led: z.boolean(),
    notifications: z.boolean(),
    polling_config: z.boolean()
  })
});

export const telemetryMessageSchema = baseDeviceMessageSchema.extend({
  temperature_c: z.number().finite(),
  humidity_pct: z.number().min(0).max(100)
});

export const notificationMessageSchema = baseDeviceMessageSchema.extend({
  kind: z.literal("generic"),
  message: z.string().min(1)
});

export const heartbeatMessageSchema = baseDeviceMessageSchema.extend({
  uptime_ms: z.number().int().nonnegative(),
  wifi_rssi: z.number().int()
});

export const commandMessageSchema = z.object({
  schema_version: z.literal(1),
  command_id: z.uuid(),
  device_mac: z.string().regex(/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/),
  issued_at: z.iso.datetime(),
  type: z.literal("led.set"),
  payload: z.object({
    power: z.boolean(),
    color_rgb: rgbColorSchema,
    brightness: z.number().int().min(0).max(100)
  })
});

export const configMessageSchema = z.object({
  schema_version: z.literal(1),
  config_id: z.uuid(),
  device_mac: z.string().regex(/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/),
  issued_at: z.iso.datetime(),
  polling_interval_sec: z.number().int().positive()
});

export const ackMessageSchema = baseDeviceMessageSchema.extend({
  target_type: z.enum(["command", "config"]),
  target_id: z.uuid(),
  status: z.enum(["confirmed", "failed"]),
  result: z.object({
    applied_state: z.object({
      power: z.boolean(),
      color_rgb: rgbColorSchema,
      brightness: z.number().int().min(0).max(100)
    })
  })
});

export const statusMessageSchema = z.enum(["online", "offline"]);

export type HelloMessage = z.infer<typeof helloMessageSchema>;
export type TelemetryMessage = z.infer<typeof telemetryMessageSchema>;
export type NotificationMessage = z.infer<typeof notificationMessageSchema>;
export type HeartbeatMessage = z.infer<typeof heartbeatMessageSchema>;
export type CommandMessage = z.infer<typeof commandMessageSchema>;
export type ConfigMessage = z.infer<typeof configMessageSchema>;
export type AckMessage = z.infer<typeof ackMessageSchema>;
export type StatusMessage = z.infer<typeof statusMessageSchema>;
