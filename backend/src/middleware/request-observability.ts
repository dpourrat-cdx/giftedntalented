import type { Request, Response } from "express";

export type RequestClass = "public_read" | "public_write" | "reset" | "admin";
const MAX_LOG_FIELD_LENGTH = 256;

type RequestLike = Pick<Request, "method" | "baseUrl" | "route" | "originalUrl" | "path" | "ip" | "headers" | "socket"> & {
  requestId?: string;
};

type ResponseLike = Pick<Response, "statusCode">;

function sanitizeLogField(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const sanitized = value.replaceAll(/[\r\n\t]+/g, " ").trim();

  if (!sanitized) {
    return null;
  }

  return sanitized.slice(0, MAX_LOG_FIELD_LENGTH);
}

export function resolveRoutePattern(request: RequestLike): string {
  const routePath = typeof request.route?.path === "string" ? request.route.path : "";
  const baseUrl = request.baseUrl || "";

  if (baseUrl || routePath) {
    return sanitizeLogField(`${baseUrl}${routePath}`) ?? sanitizeLogField(request.originalUrl) ?? sanitizeLogField(request.path) ?? "/";
  }

  return sanitizeLogField(request.originalUrl) ?? sanitizeLogField(request.path) ?? "/";
}

export function resolveRequestClass(request: RequestLike): RequestClass {
  const method = String(request.method || "GET").toUpperCase();
  const routePattern = resolveRoutePattern(request);

  if (routePattern.startsWith("/api/v1/admin/scores/reset")) {
    return "reset";
  }

  if (routePattern.startsWith("/api/v1/admin/")) {
    return "admin";
  }

  if (method === "GET" || routePattern.startsWith("/api/v1/health")) {
    return "public_read";
  }

  return "public_write";
}

export function resolveForwardedFor(request: RequestLike): string | null {
  const headerValue = request.headers?.["x-forwarded-for"];

  if (Array.isArray(headerValue)) {
    return sanitizeLogField(headerValue.join(", "));
  }

  return sanitizeLogField(headerValue);
}

export function resolveRemoteIp(request: RequestLike): string | null {
  return sanitizeLogField(request.ip) ?? sanitizeLogField(request.socket?.remoteAddress) ?? null;
}

export function buildRequestLogContext(
  request: RequestLike,
  response?: Partial<ResponseLike> | null,
  latencyMs?: number,
) {
  const context = {
    requestId: sanitizeLogField(request.requestId) ?? null,
    route: resolveRoutePattern(request),
    method: String(request.method || "GET").toUpperCase(),
    requestClass: resolveRequestClass(request),
    remoteIp: resolveRemoteIp(request),
    forwardedFor: resolveForwardedFor(request),
  };

  if (typeof response?.statusCode === "number") {
    return {
      ...context,
      statusCode: response.statusCode,
      latencyMs: typeof latencyMs === "number" ? Math.round(latencyMs) : undefined,
    };
  }

  return context;
}

export function resolveHttpLogLevel(
  _request: RequestLike,
  response: ResponseLike,
  error?: Error,
): "info" | "warn" | "error" {
  if (error || response.statusCode >= 500) {
    return "error";
  }

  if (response.statusCode >= 400) {
    return "warn";
  }

  return "info";
}
