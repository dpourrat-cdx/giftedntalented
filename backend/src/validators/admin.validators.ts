import { z } from "zod";

export const resetScoresBodySchema = z.object({
  resetPin: z.string().trim().min(1).max(80),
});

const pushTargetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("token"),
    token: z.string().trim().min(20).max(4096),
  }),
  z.object({
    type: z.literal("player"),
    playerName: z.string().trim().min(1).max(40),
  }),
  z.object({
    type: z.literal("allAndroid"),
  }),
]);

export const sendPushBodySchema = z.object({
  target: pushTargetSchema,
  notification: z.object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(500),
  }),
  data: z.record(z.string(), z.string()).optional(),
});
