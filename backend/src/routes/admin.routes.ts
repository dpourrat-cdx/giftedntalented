import { Router } from "express";
import { adminAuth } from "../middleware/admin-auth.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { adminLimiter, resetLimiter } from "../middleware/rate-limit.js";
import { validate } from "../middleware/validate.js";
import { DeviceService } from "../services/device.service.js";
import { PushService } from "../services/push.service.js";
import { ScoreService } from "../services/score.service.js";
import { resetScoresBodySchema, sendPushBodySchema } from "../validators/admin.validators.js";

const scoreService = new ScoreService();
const pushService = new PushService(new DeviceService());

export const adminRouter = Router();

adminRouter.post(
  "/admin/scores/reset",
  resetLimiter,
  validate({ body: resetScoresBodySchema }),
  asyncHandler(async (request, response) => {
    const result = await scoreService.resetScores(request.body.resetPin);
    response.json({
      ...result,
      requestId: request.requestId,
    });
  }),
);

adminRouter.post(
  "/admin/push/send",
  adminLimiter,
  adminAuth,
  validate({ body: sendPushBodySchema }),
  asyncHandler(async (request, response) => {
    const result = await pushService.sendPush(request.body);
    response.json({
      ...result,
      requestId: request.requestId,
    });
  }),
);
