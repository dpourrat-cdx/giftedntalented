import type { Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { buildRequestLogContext } from "./request-observability.js";

type RateLimitRequest = Request & {
  rateLimit?: {
    limit?: number;
    used?: number;
    remaining?: number;
    resetTime?: Date;
  };
};

function buildRateLimitWarning(request: RateLimitRequest, response: Response, limiterName: string, windowMs: number) {
  return {
    event: "rate_limit_exceeded",
    limiter: limiterName,
    windowMs,
    ...buildRequestLogContext(request, response),
    rateLimit: request.rateLimit
      ? {
          limit: request.rateLimit.limit,
          used: request.rateLimit.used,
          remaining: request.rateLimit.remaining,
          resetTime: request.rateLimit.resetTime?.toISOString() ?? null,
        }
      : undefined,
  };
}

function buildLimiter(limiterName: string, windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler(request, response, _next, options) {
      response.status(options.statusCode);
      logger.warn(
        buildRateLimitWarning(request as RateLimitRequest, response, limiterName, windowMs),
        "Rate limit exceeded",
      );
      response.send(options.message);
    },
  });
}

export const readLimiter = buildLimiter("read", env.READ_RATE_LIMIT_WINDOW_MS, env.READ_RATE_LIMIT_MAX);
export const lookupLimiter = buildLimiter("lookup", env.READ_RATE_LIMIT_WINDOW_MS, 21);
export const writeLimiter = buildLimiter("write", env.WRITE_RATE_LIMIT_WINDOW_MS, env.WRITE_RATE_LIMIT_MAX);
export const resetLimiter = buildLimiter("reset", env.RESET_RATE_LIMIT_WINDOW_MS, env.RESET_RATE_LIMIT_MAX);
export const adminLimiter = buildLimiter("admin", env.ADMIN_RATE_LIMIT_WINDOW_MS, env.ADMIN_RATE_LIMIT_MAX);

export { buildRateLimitWarning };
