import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

function buildLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

export const readLimiter = buildLimiter(env.READ_RATE_LIMIT_WINDOW_MS, env.READ_RATE_LIMIT_MAX);
export const lookupLimiter = buildLimiter(env.READ_RATE_LIMIT_WINDOW_MS, 21);
export const writeLimiter = buildLimiter(env.WRITE_RATE_LIMIT_WINDOW_MS, env.WRITE_RATE_LIMIT_MAX);
export const resetLimiter = buildLimiter(env.RESET_RATE_LIMIT_WINDOW_MS, env.RESET_RATE_LIMIT_MAX);
export const adminLimiter = buildLimiter(env.ADMIN_RATE_LIMIT_WINDOW_MS, env.ADMIN_RATE_LIMIT_MAX);
