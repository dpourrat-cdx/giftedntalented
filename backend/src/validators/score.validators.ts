import { z } from "zod";
import { normalizePlayerName } from "../utils/normalize.js";

export const playerNameParamsSchema = z.object({
  playerName: z
    .string()
    .transform(normalizePlayerName)
    .refine((value) => value.length >= 1 && value.length <= 40, "Player name must be between 1 and 40 characters."),
});

export const scoreRecordBodySchema = z
  .object({
    score: z.number().int().min(0),
    percentage: z.number().int().min(0).max(100),
    totalQuestions: z.number().int().positive(),
    elapsedSeconds: z.number().int().min(0).nullable().optional(),
    clientType: z.enum(["web", "android"]),
    mode: z.enum(["quiz", "story"]).default("quiz"),
  })
  .refine((value) => value.score <= value.totalQuestions, {
    message: "Score cannot be greater than total questions.",
    path: ["score"],
  });
