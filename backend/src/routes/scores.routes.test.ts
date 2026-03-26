import request from "supertest";
import { buildApp } from "../app.js";

const mockRpc = vi.fn();

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
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

describe("Score routes", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp();
    vi.clearAllMocks();
  });

  describe("GET /api/v1/players/:playerName/record", () => {
    it("returns 200 with record when found", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            player_name: "Alice",
            score: 50,
            percentage: 78,
            total_questions: 64,
            elapsed_seconds: 1200,
            completed_at: "2026-01-01T00:00:00Z",
          },
        ],
        error: null,
      });

      const res = await request(app).get("/api/v1/players/Alice/record");

      expect(res.status).toBe(200);
      expect(res.body.playerName).toBe("Alice");
      expect(res.body.score).toBe(50);
      expect(res.body.source).toBe("supabase");
    });

    it("returns 404 when no record exists", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const res = await request(app).get("/api/v1/players/Unknown/record");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("PLAYER_RECORD_NOT_FOUND");
    });
  });

  describe("POST /api/v1/players/:playerName/record", () => {
    it("returns 410 — endpoint is disabled", async () => {
      const res = await request(app)
        .post("/api/v1/players/Alice/record")
        .send({ score: 50, percentage: 78, totalQuestions: 64, clientType: "web" });

      expect(res.status).toBe(410);
      expect(res.body.error).toBe("LEGACY_SCORE_ENDPOINT_DISABLED");
    });
  });
});
