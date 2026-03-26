import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import { lookupLimiter, writeLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { ScoreService } from "../services/score.service.js";
import { playerNameParamsSchema } from "../validators/score.validators.js";

const scoreService = new ScoreService();

export const scoresRouter = Router();

scoresRouter.get(
  "/players/:playerName/record",
  lookupLimiter,
  validate({ params: playerNameParamsSchema }),
  asyncHandler(async (request, response) => {
    const playerName = String(request.params.playerName);
    const record = await scoreService.getPlayerRecord(playerName);

    if (!record) {
      response.status(404).json({
        error: "PLAYER_RECORD_NOT_FOUND",
        message: "The requested score record is not available.",
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

scoresRouter.post("/players/:playerName/record", writeLimiter, asyncHandler(async (request, response) => {
  response.status(410).json({
    error: "LEGACY_SCORE_ENDPOINT_DISABLED",
    message: "Direct score submission is disabled. Start a score attempt and submit validated answers instead.",
    requestId: request.requestId,
  });
}));
