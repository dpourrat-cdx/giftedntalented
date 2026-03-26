import request from "supertest";
import { buildApp } from "../app.js";

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockNot = vi.fn();

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn((table: string) => {
      if (table === "app_admin_settings") {
        return {
          select: () => ({
            eq: () => ({
              single: () => mockSingle(),
            }),
          }),
        };
      }
      // test_scores
      return {
        select: (...args: unknown[]) => {
          mockSelect(...args);
          return mockSelect();
        },
        delete: () => ({
          not: (...args: unknown[]) => {
            mockNot(...args);
            return mockNot();
          },
        }),
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({ single: vi.fn() }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn(),
          in: vi.fn(),
        }),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn(),
      };
    }),
  },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

const mockGetFirebaseMessaging = vi.fn();
vi.mock("../lib/firebase.js", () => ({
  getFirebaseMessaging: () => mockGetFirebaseMessaging(),
}));

vi.mock("pino-http", () => {
  const middleware = (_req: unknown, _res: unknown, next: () => void) => next();
  return { default: () => middleware };
});

vi.mock("../config/logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })) },
}));

import bcrypt from "bcryptjs";

describe("Admin routes", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp();
    vi.clearAllMocks();
  });

  describe("POST /api/v1/admin/scores/reset", () => {
    it("returns 200 with deletedCount on success", async () => {
      mockSingle.mockResolvedValue({
        data: { reset_pin_hash: "$2a$10$hash" },
        error: null,
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
      mockSelect.mockResolvedValue({ count: 3, error: null });
      mockNot.mockResolvedValue({ error: null });

      const res = await request(app)
        .post("/api/v1/admin/scores/reset")
        .send({ resetPin: "1234" });

      expect(res.status).toBe(200);
      expect(res.body.deletedCount).toBe(3);
      expect(res.body.resetAt).toBeDefined();
    });

    it("returns 401 on wrong PIN", async () => {
      mockSingle.mockResolvedValue({
        data: { reset_pin_hash: "$2a$10$hash" },
        error: null,
      });
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const res = await request(app)
        .post("/api/v1/admin/scores/reset")
        .send({ resetPin: "wrong" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("INVALID_RESET_PIN");
    });

    it("returns 400 on missing resetPin", async () => {
      const res = await request(app)
        .post("/api/v1/admin/scores/reset")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/admin/push/send", () => {
    const validBody = {
      target: { type: "allAndroid" },
      notification: { title: "Test", body: "Hello world" },
    };

    it("returns 401 when X-Admin-Key is missing", async () => {
      const res = await request(app)
        .post("/api/v1/admin/push/send")
        .send(validBody);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("ADMIN_AUTH_REQUIRED");
    });

    it("returns 401 when X-Admin-Key is wrong", async () => {
      const res = await request(app)
        .post("/api/v1/admin/push/send")
        .set("X-Admin-Key", "wrong-key-but-long-enough-24ch")
        .send(validBody);

      expect(res.status).toBe(401);
    });

    it("returns 503 when FCM not configured", async () => {
      mockGetFirebaseMessaging.mockReturnValue(null);

      const res = await request(app)
        .post("/api/v1/admin/push/send")
        .set("X-Admin-Key", "test-admin-api-key-at-least-24-chars")
        .send(validBody);

      expect(res.status).toBe(503);
      expect(res.body.error).toBe("FCM_NOT_CONFIGURED");
    });

    it("returns 400 on invalid body", async () => {
      const res = await request(app)
        .post("/api/v1/admin/push/send")
        .set("X-Admin-Key", "test-admin-api-key-at-least-24-chars")
        .send({ target: { type: "invalid" } });

      expect(res.status).toBe(400);
    });
  });
});
