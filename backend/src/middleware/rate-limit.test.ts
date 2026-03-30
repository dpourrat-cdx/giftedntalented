import type { Request, Response } from "express";
import { buildRateLimitWarning } from "./rate-limit.js";

function createRequest(overrides: Partial<Request> = {}) {
  return {
    method: "POST",
    baseUrl: "/api/v1",
    route: { path: "/admin/scores/reset" } as Request["route"],
    originalUrl: "/api/v1/admin/scores/reset",
    path: "/api/v1/admin/scores/reset",
    ip: "203.0.113.10",
    headers: {
      "x-forwarded-for": "198.51.100.8",
    },
    socket: { remoteAddress: "198.51.100.5" },
    requestId: "req-456",
    rateLimit: {
      limit: 5,
      used: 6,
      remaining: 0,
      resetTime: new Date("2026-03-29T12:00:00.000Z"),
    },
    ...overrides,
  } as Request;
}

describe("buildRateLimitWarning", () => {
  it("emits structured warning fields that match the shared request schema", () => {
    const warning = buildRateLimitWarning(
      createRequest(),
      { statusCode: 429 } as Response,
      "reset",
      60_000,
    );

    expect(warning).toEqual({
      event: "rate_limit_exceeded",
      limiter: "reset",
      windowMs: 60_000,
      requestId: "req-456",
      route: "/api/v1/admin/scores/reset",
      method: "POST",
      requestClass: "reset",
      remoteIp: "203.0.113.10",
      forwardedFor: "198.51.100.8",
      statusCode: 429,
      latencyMs: undefined,
      rateLimit: {
        limit: 5,
        used: 6,
        remaining: 0,
        resetTime: "2026-03-29T12:00:00.000Z",
      },
    });
  });
});
