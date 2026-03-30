import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/errors.js";
import { errorHandler } from "./error-handler.js";

vi.mock("../config/logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

function createMockReqRes() {
  const req = {
    requestId: "test-request-id",
    method: "GET",
    baseUrl: "",
    originalUrl: "/",
    path: "/",
    headers: {},
    ip: "203.0.113.10",
    socket: { remoteAddress: "198.51.100.5" },
  } as unknown as Request;
  const jsonFn = vi.fn();
  const statusFn = vi.fn(() => ({ json: jsonFn }));
  const res = { status: statusFn, json: jsonFn } as unknown as Response;
  const next: NextFunction = vi.fn();
  return { req, res, next, statusFn, jsonFn };
}

describe("errorHandler", () => {
  it("handles ZodError with 400 and VALIDATION_ERROR", () => {
    const { req, res, next, statusFn, jsonFn } = createMockReqRes();
    const zodError = new ZodError([
      { code: "invalid_type", expected: "string", received: "number", path: ["name"], message: "Expected string" },
    ]);

    errorHandler(zodError, req, res, next);

    expect(statusFn).toHaveBeenCalledWith(400);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "VALIDATION_ERROR",
        message: "The request data was invalid.",
        requestId: "test-request-id",
      }),
    );
  });

  it("handles AppError with its own statusCode and code", () => {
    const { req, res, next, statusFn, jsonFn } = createMockReqRes();
    const appError = new AppError(409, "CONFLICT", "Already exists", { id: 1 });

    errorHandler(appError, req, res, next);

    expect(statusFn).toHaveBeenCalledWith(409);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "CONFLICT",
        message: "Already exists",
        details: { id: 1 },
        requestId: "test-request-id",
      }),
    );
  });

  it("handles unknown errors with 500 INTERNAL_SERVER_ERROR", () => {
    const { req, res, next, statusFn, jsonFn } = createMockReqRes();

    errorHandler(new Error("boom"), req, res, next);

    expect(statusFn).toHaveBeenCalledWith(500);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "INTERNAL_SERVER_ERROR",
        message: "The server could not complete the request.",
        requestId: "test-request-id",
      }),
    );
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "test-request-id",
        statusCode: 500,
        route: "/",
        method: "GET",
        requestClass: "public_read",
      }),
      "Unhandled request error",
    );
  });
});
