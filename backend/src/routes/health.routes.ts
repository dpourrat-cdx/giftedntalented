import { Router } from "express";
import { env } from "../config/env.js";
import { supabase } from "../lib/supabase.js";
import { asyncHandler } from "../middleware/async-handler.js";

export const healthRouter = Router();

healthRouter.get(
  "/health",
  asyncHandler(async (_request, response) => {
    const { error } = await supabase.from("test_scores").select("id", { head: true, count: "exact" });

    response.json({
      status: error ? "degraded" : "ok",
      environment: env.NODE_ENV,
      checkedAt: new Date().toISOString(),
      services: {
        supabase: error ? "down" : "ok",
        fcm: env.isFcmConfigured ? "configured" : "not_configured",
      },
    });
  }),
);
