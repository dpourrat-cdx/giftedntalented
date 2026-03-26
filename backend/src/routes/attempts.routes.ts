import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { writeLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { AttemptService } from "../services/attempt.service.js";
import {
  attemptIdParamsSchema,
  finalizeAttemptBodySchema,
  startAttemptBodySchema,
  submitAnswerBodySchema,
} from "../validators/attempt.validators.js";

const attemptService = new AttemptService();

export const attemptsRouter = Router();

attemptsRouter.post(
  "/attempts",
  writeLimiter,
  validate({ body: startAttemptBodySchema }),
  asyncHandler(async (request, response) => {
    const result = await attemptService.startAttempt(request.body);

    response.status(result.storyOnly ? 200 : 201).json({
      ...result,
      requestId: request.requestId,
    });
  }),
);

attemptsRouter.post(
  "/attempts/:attemptId/answers",
  writeLimiter,
  validate({ params: attemptIdParamsSchema, body: submitAnswerBodySchema }),
  asyncHandler(async (request, response) => {
    const result = await attemptService.submitAnswer(String(request.params.attemptId), request.body);

    response.status(201).json({
      ...result,
      requestId: request.requestId,
    });
  }),
);

attemptsRouter.post(
  "/attempts/:attemptId/finalize",
  writeLimiter,
  validate({ params: attemptIdParamsSchema, body: finalizeAttemptBodySchema }),
  asyncHandler(async (request, response) => {
    const result = await attemptService.finalizeAttempt(String(request.params.attemptId), request.body);

    response.json({
      ...result,
      requestId: request.requestId,
    });
  }),
);
