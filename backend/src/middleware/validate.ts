import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export function validate(schema: {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (schema.body) {
      request.body = schema.body.parse(request.body) as Request["body"];
    }

    if (schema.params) {
      request.params = schema.params.parse(request.params) as Request["params"];
    }

    if (schema.query) {
      request.query = schema.query.parse(request.query) as Request["query"];
    }

    next();
  };
}
