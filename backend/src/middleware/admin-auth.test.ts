import type { NextFunction, Request, Response } from "express";
import { adminAuth } from "./admin-auth.js";
import { AppError } from "../utils/errors.js";

vi.mock("../config/env.js", () => ({
  env: {
    ADMIN_API_KEY: "test-admin-api-key-at-least-24-chars",
  },
}));

function createMockReqRes(adminKeyHeader?: string) {
  const req = {
    header: vi.fn((name: string) => {
      if (name === "X-Admin-Key") return adminKeyHeader;
      return undefined;
    }),
  } as unknown as Request;
  const res = {} as Response;
  const next: NextFunction = vi.fn();
  return { req, res, next };
}

describe("adminAuth", () => {
  it("calls next() with no error for correct key", () => {
    const { req, res, next } = createMockReqRes("test-admin-api-key-at-least-24-chars");
    adminAuth(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next with AppError(401) when key is missing", () => {
    const { req, res, next } = createMockReqRes(undefined);
    adminAuth(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("ADMIN_AUTH_REQUIRED");
  });

  it("calls next with AppError(401) when key is wrong", () => {
    const { req, res, next } = createMockReqRes("wrong-key-but-long-enough");
    adminAuth(req, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as ReturnType<typeof vi.fn>).mock.calls[0][0] as AppError;
    expect(err.statusCode).toBe(401);
  });
});
