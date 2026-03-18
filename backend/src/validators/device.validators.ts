import { z } from "zod";
import { normalizePlayerName } from "../utils/normalize.js";

export const registerDeviceBodySchema = z.object({
  deviceToken: z.string().trim().min(20).max(4096),
  platform: z.enum(["android", "web"]),
  clientType: z.enum(["android", "web"]),
  playerName: z
    .string()
    .trim()
    .transform((value) => (value ? normalizePlayerName(value) : ""))
    .optional(),
  appVersion: z.string().trim().max(50).optional(),
});

export const unregisterDeviceBodySchema = z.object({
  deviceToken: z.string().trim().min(20).max(4096),
});
