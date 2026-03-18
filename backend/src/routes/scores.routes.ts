import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { readLimiter, writeLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { ScoreService } from "../services/score.service.js";
import { playerNameParamsSchema, scoreRecordBodySchema } from "../validators/score.validators.js";

const scoreService = new ScoreService();

export const scoresRouter = Router();

scoresRouter.get(
  "/players/:playerName/record",
  readLimiter,
  validate({ params: playerNameParamsSchema }),
  asyncHandler(async (request, response) => {
    const record = await scoreService.getPlayerRecord(request.params.playerName);

    if (!record) {
      response.status(404).json({
        error: "PLAYER_RECORD_NOT_FOUND",
        message: "No saved record exists for that player yet.",
        requestId: request.requestId,
      });
      return;
    }

    response.json({
      ...record,
      source: "supabase",
      requestId: request.requestId,
    });
  }),
);

scoresRouter.post(
  "/players/:playerName/record",
  writeLimiter,
  validate({ params: playerNameParamsSchema, body: scoreRecordBodySchema }),
  asyncHandler(async (request, response) => {
    const result = await scoreService.savePlayerRecord({
      playerName: request.params.playerName,
      ...request.body,
    });

    response.status(result.storyOnly ? 200 : 201).json({
      ...result,
      requestId: request.requestId,
    });
  }),
);
