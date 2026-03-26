import { AppError } from "./errors.js";

describe("AppError", () => {
  it("sets statusCode, code, and message", () => {
    const err = new AppError(404, "NOT_FOUND", "Resource not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Resource not found");
  });

  it("sets details when provided", () => {
    const details = { field: "name" };
    const err = new AppError(400, "VALIDATION_ERROR", "Invalid input", details);
    expect(err.details).toEqual({ field: "name" });
  });

  it("leaves details undefined when not provided", () => {
    const err = new AppError(500, "INTERNAL", "Something broke");
    expect(err.details).toBeUndefined();
  });

  it("is an instance of Error", () => {
    const err = new AppError(500, "INTERNAL", "Something broke");
    expect(err).toBeInstanceOf(Error);
  });
});
