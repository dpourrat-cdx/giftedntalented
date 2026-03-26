import type { NextFunction, Request, Response } from "express";
import { z, ZodError } from "zod";
import { validate } from "./validate.js";

function createMockReqRes(body?: unknown, params?: unknown, query?: unknown) {
  const req = { body, params, query } as unknown as Request;
  const res = {} as Response;
  const next: NextFunction = vi.fn();
  return { req, res, next };
}

describe("validate", () => {
  const bodySchema = z.object({
    name: z.string().min(1),
    age: z.number().int().positive(),
  });

  it("parses valid body and replaces req.body", () => {
    const { req, res, next } = createMockReqRes({ name: "Alice", age: 7 });
    const middleware = validate({ body: bodySchema });

    middleware(req, res, next);

    expect(req.body).toEqual({ name: "Alice", age: 7 });
    expect(next).toHaveBeenCalledWith();
  });

  it("throws ZodError for invalid body", () => {
    const { req, res, next } = createMockReqRes({ name: "", age: -1 });
    const middleware = validate({ body: bodySchema });

    expect(() => middleware(req, res, next)).toThrow(ZodError);
  });

  it("validates params when schema provided", () => {
    const paramsSchema = z.object({ id: z.string().min(1) });
    const { req, res, next } = createMockReqRes(undefined, { id: "abc" });
    const middleware = validate({ params: paramsSchema });

    middleware(req, res, next);

    expect(req.params).toEqual({ id: "abc" });
    expect(next).toHaveBeenCalledWith();
  });

  it("validates query when schema provided", () => {
    const querySchema = z.object({ page: z.string() });
    const { req, res, next } = createMockReqRes(undefined, undefined, { page: "1" });
    const middleware = validate({ query: querySchema });

    middleware(req, res, next);

    expect(req.query).toEqual({ page: "1" });
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next without error when no schemas provided", () => {
    const { req, res, next } = createMockReqRes({ anything: true });
    const middleware = validate({});

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
