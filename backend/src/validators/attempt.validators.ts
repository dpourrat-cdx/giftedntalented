import { z } from "zod";
import { normalizePlayerName } from "../utils/normalize.js";

export const attemptIdParamsSchema = z.object({
  attemptId: z.uuid(),
});

export const startAttemptBodySchema = z.object({
  playerName: z
    .string()
    .transform(normalizePlayerName)
    .refine((value) => value.length >= 1 && value.length <= 40, "Player name must be between 1 and 40 characters."),
  clientType: z.enum(["web", "android"]),
  mode: z.enum(["quiz", "story"]).default("quiz"),
  questions: z
    .array(
      z.object({
        questionId: z.number().int().positive(),
        bankId: z.string().trim().min(1).max(80),
        options: z.array(z.string().min(1)).length(4),
      }),
    )
    .max(128)
    .optional(),
});

export const submitAnswerBodySchema = z.object({
  questionId: z.number().int().positive(),
  bankId: z.string().trim().min(1).max(80),
  selectedAnswer: z.number().int().min(0).max(3),
  elapsedSeconds: z.number().int().min(0).nullable().optional(),
});

export const finalizeAttemptBodySchema = z.object({
  elapsedSeconds: z.number().int().min(0).nullable().optional(),
});
