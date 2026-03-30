import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/errors.js";
import { buildRequestLogContext } from "./request-observability.js";

export function errorHandler(error: unknown, request: Request, response: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: "VALIDATION_ERROR",
      message: "The request data was invalid.",
      details: error.flatten(),
      requestId: request.requestId,
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      error: error.code,
      message: error.message,
      details: error.details,
      requestId: request.requestId,
    });
    return;
  }

  logger.error(
    {
      err: error,
      ...buildRequestLogContext(request, { statusCode: 500 }),
    },
    "Unhandled request error",
  );

  response.status(500).json({
    error: "INTERNAL_SERVER_ERROR",
    message: "The server could not complete the request.",
    requestId: request.requestId,
  });
}
