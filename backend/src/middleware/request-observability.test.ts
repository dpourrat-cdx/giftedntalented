import type { Request, Response } from "express";
import {
  buildRequestLogContext,
  resolveForwardedFor,
  resolveHttpLogLevel,
  resolveRequestClass,
  resolveRoutePattern,
} from "./request-observability.js";

function createRequest(overrides: Partial<Request> = {}) {
  return {
    method: "GET",
    baseUrl: "",
    route: undefined,
    originalUrl: "/api/v1/health",
    path: "/api/v1/health",
    ip: "203.0.113.10",
    headers: {},
    socket: { remoteAddress: "198.51.100.5" },
    requestId: "req-123",
    ...overrides,
  } as Request;
}

function createResponse(statusCode = 200) {
  return { statusCode } as Response;
}

describe("request observability helpers", () => {
  it("builds the route pattern from the matched express route", () => {
    const request = createRequest({
      baseUrl: "/api/v1",
      route: { path: "/attempts/:attemptId/finalize" } as Request["route"],
      originalUrl: "/api/v1/attempts/attempt-123/finalize",
    });

    expect(resolveRoutePattern(request)).toBe("/api/v1/attempts/:attemptId/finalize");
  });

  it("falls back to the original url when no matched route is available", () => {
    const request = createRequest({
      route: undefined,
      originalUrl: "/api/v1/unknown?debug=true",
    });

    expect(resolveRoutePattern(request)).toBe("/api/v1/unknown?debug=true");
  });

  it("classifies reset, admin, read, and write requests consistently", () => {
    expect(
      resolveRequestClass(
        createRequest({
          method: "POST",
          baseUrl: "/api/v1",
          route: { path: "/admin/scores/reset" } as Request["route"],
        }),
      ),
    ).toBe("reset");

    expect(
      resolveRequestClass(
        createRequest({
          method: "POST",
          baseUrl: "/api/v1",
          route: { path: "/admin/push/send" } as Request["route"],
        }),
      ),
    ).toBe("admin");

    expect(
      resolveRequestClass(
        createRequest({
          method: "GET",
          baseUrl: "/api/v1",
          route: { path: "/players/:playerName/record" } as Request["route"],
        }),
      ),
    ).toBe("public_read");

    expect(
      resolveRequestClass(
        createRequest({
          method: "POST",
          baseUrl: "/api/v1",
          route: { path: "/attempts" } as Request["route"],
        }),
      ),
    ).toBe("public_write");
  });

  it("normalizes forwarded-for headers and remote addresses into log context", () => {
    const request = createRequest({
      headers: {
        "x-forwarded-for": ["198.51.100.6", "203.0.113.20"],
      } as Request["headers"],
    });

    expect(resolveForwardedFor(request)).toBe("198.51.100.6, 203.0.113.20");
    expect(buildRequestLogContext(request, createResponse(201), 42.4)).toEqual({
      requestId: "req-123",
      route: "/api/v1/health",
      method: "GET",
      requestClass: "public_read",
      remoteIp: "203.0.113.10",
      forwardedFor: "198.51.100.6, 203.0.113.20",
      statusCode: 201,
      latencyMs: 42,
    });
  });

  it("sanitizes request-derived log fields before writing them", () => {
    const request = createRequest({
      requestId: "req-123\r\nforged",
      originalUrl: "/api/v1/health\r\nforged",
      ip: "203.0.113.10\r\n127.0.0.1",
      headers: {
        "x-forwarded-for": "198.51.100.6\r\nmalicious-entry",
      } as Request["headers"],
    });

    expect(buildRequestLogContext(request, createResponse(200))).toEqual({
      requestId: "req-123 forged",
      route: "/api/v1/health forged",
      method: "GET",
      requestClass: "public_read",
      remoteIp: "203.0.113.10 127.0.0.1",
      forwardedFor: "198.51.100.6 malicious-entry",
      statusCode: 200,
      latencyMs: undefined,
    });
  });

  it("uses warn for 4xx responses and error for 5xx or thrown errors", () => {
    const request = createRequest();

    expect(resolveHttpLogLevel(request, createResponse(200))).toBe("info");
    expect(resolveHttpLogLevel(request, createResponse(401))).toBe("warn");
    expect(resolveHttpLogLevel(request, createResponse(500))).toBe("error");
    expect(resolveHttpLogLevel(request, createResponse(200), new Error("boom"))).toBe("error");
  });
});
