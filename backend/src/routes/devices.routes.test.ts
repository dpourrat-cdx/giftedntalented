import request from "supertest";
import { buildApp } from "../app.js";

const mockSingle = vi.fn();
const mockEq = vi.fn();

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: () => mockSingle(),
        })),
      })),
      update: vi.fn(() => ({
        eq: (...args: unknown[]) => {
          mockEq(...args);
          return mockEq();
        },
      })),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));

vi.mock("../lib/firebase.js", () => ({
  getFirebaseMessaging: vi.fn(() => null),
}));

vi.mock("pino-http", () => {
  const middleware = (_req: unknown, _res: unknown, next: () => void) => next();
  return { default: () => middleware };
});

vi.mock("../config/logger.js", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })) },
}));

describe("Device routes", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp();
    vi.clearAllMocks();
  });

  describe("POST /api/v1/devices/register", () => {
    const validBody = {
      deviceToken: "a".repeat(30),
      platform: "android",
      clientType: "android",
    };

    it("returns 201 with device data", async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: "uuid-1",
          platform: "android",
          client_type: "android",
          player_name: null,
          app_version: null,
          is_active: true,
          updated_at: "2026-01-01T00:00:00Z",
          last_seen_at: "2026-01-01T00:00:00Z",
        },
        error: null,
      });

      const res = await request(app)
        .post("/api/v1/devices/register")
        .send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.device).toBeDefined();
    });

    it("returns 400 when deviceToken too short", async () => {
      const res = await request(app)
        .post("/api/v1/devices/register")
        .send({ ...validBody, deviceToken: "short" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_ERROR");
    });
  });

  describe("POST /api/v1/devices/unregister", () => {
    it("returns 200 with success", async () => {
      mockEq.mockResolvedValue({ error: null });

      const res = await request(app)
        .post("/api/v1/devices/unregister")
        .send({ deviceToken: "a".repeat(30) });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("returns 400 when deviceToken missing", async () => {
      const res = await request(app)
        .post("/api/v1/devices/unregister")
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
