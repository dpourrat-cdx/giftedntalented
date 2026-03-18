import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";

export function notFoundMiddleware(_request: Request, _response: Response, next: NextFunction) {
  next(new AppError(404, "NOT_FOUND", "The requested endpoint was not found."));
}
