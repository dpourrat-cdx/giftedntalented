import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export function adminAuth(request: Request, _response: Response, next: NextFunction) {
  const providedKey = request.header("X-Admin-Key");
  const expectedKeyBuffer = Buffer.from(env.ADMIN_API_KEY, "utf8");
  const providedKeyBuffer = providedKey ? Buffer.from(providedKey, "utf8") : null;

  const isValidKey = Boolean(
    providedKeyBuffer &&
      providedKeyBuffer.length === expectedKeyBuffer.length &&
      timingSafeEqual(providedKeyBuffer, expectedKeyBuffer),
  );

  if (!isValidKey) {
    next(new AppError(401, "ADMIN_AUTH_REQUIRED", "A valid admin key is required."));
    return;
  }

  next();
}
