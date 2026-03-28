import { AppError } from "../utils/errors.js";
import { corsMiddleware, corsOptions } from "./cors.js";

vi.mock("./env.js", () => ({
  env: {
    ALLOWED_ORIGINS: ["https://allowed.example"],
  },
}));

describe("corsOptions", () => {
  it("allows missing origins for same-origin and non-browser requests", async () => {
    await new Promise<void>((resolve, reject) => {
      corsOptions.origin(undefined, (error, allowed) => {
        try {
          expect(error).toBeNull();
          expect(allowed).toBe(true);
          resolve();
        } catch (assertionError) {
          reject(assertionError);
        }
      });
    });
  });

  it("allows configured origins and blocks unexpected ones", async () => {
    await new Promise<void>((resolve, reject) => {
      corsOptions.origin("https://allowed.example", (error, allowed) => {
        try {
          expect(error).toBeNull();
          expect(allowed).toBe(true);
        } catch (assertionError) {
          reject(assertionError);
          return;
        }

        corsOptions.origin("https://blocked.example", (blockedError, blockedAllowed) => {
          try {
            expect(blockedError).toBeInstanceOf(AppError);
            expect((blockedError as AppError).statusCode).toBe(403);
            expect((blockedError as AppError).code).toBe("CORS_ORIGIN_BLOCKED");
            expect(blockedAllowed).toBeUndefined();
            expect(typeof corsMiddleware).toBe("function");
            resolve();
          } catch (assertionError) {
            reject(assertionError);
          }
        });
      });
    });
  });
});
