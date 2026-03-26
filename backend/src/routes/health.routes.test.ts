import request from "supertest";
import { buildApp } from "../app.js";

vi.mock("../lib/supabase.js", () => {
  const mockSelect = vi.fn();
  return {
    supabase: {
      from: vi.fn(() => ({
        select: mockSelect,
        upsert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn(),
      })),
      rpc: vi.fn(),
    },
    __mockSelect: mockSelect,
  };
});

vi.mock("../lib/firebase.js", () => ({
  getFirebaseMessaging: vi.fn(() => null),
}));

// Mock pino-http to avoid logger.levels.values error
vi.mock("pino-http", () => {
  const middleware = (_req: unknown, _res: unknown, next: () => void) => next();
  return { default: () => middleware };
});

vi.mock("../config/logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })) },
}));

describe("GET /api/v1/health", () => {
  it("returns ok when supabase is healthy", async () => {
    const { __mockSelect } = await import("../lib/supabase.js") as Record<string, ReturnType<typeof vi.fn>>;
    __mockSelect.mockResolvedValue({ error: null });

    const app = buildApp();
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.services.supabase).toBe("ok");
  });

  it("returns degraded when supabase has errors", async () => {
    const { __mockSelect } = await import("../lib/supabase.js") as Record<string, ReturnType<typeof vi.fn>>;
    __mockSelect.mockResolvedValue({ error: { message: "connection refused" } });

    const app = buildApp();
    const res = await request(app).get("/api/v1/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("degraded");
    expect(res.body.services.supabase).toBe("down");
  });

  it("includes fcm status", async () => {
    const { __mockSelect } = await import("../lib/supabase.js") as Record<string, ReturnType<typeof vi.fn>>;
    __mockSelect.mockResolvedValue({ error: null });

    const app = buildApp();
    const res = await request(app).get("/api/v1/health");

    expect(res.body.services.fcm).toBeDefined();
  });
});
