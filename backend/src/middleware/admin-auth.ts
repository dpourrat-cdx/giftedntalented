import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export function adminAuth(request: Request, _response: Response, next: NextFunction) {
  const providedKey = request.header("X-Admin-Key");

  if (!providedKey || providedKey !== env.ADMIN_API_KEY) {
    next(new AppError(401, "ADMIN_AUTH_REQUIRED", "A valid admin key is required."));
    return;
  }

  next();
}
