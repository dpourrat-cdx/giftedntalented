import { ScoreService } from "./score.service.js";
import { AppError } from "../utils/errors.js";

// Mock supabase with chainable builder
const mockRpc = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockDelete = vi.fn();
const mockNot = vi.fn();
const mockEq = vi.fn();

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: vi.fn(() => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return { single: () => mockSingle() };
          },
        };
      },
      delete: () => {
        mockDelete();
        return {
          not: (...notArgs: unknown[]) => {
            mockNot(...notArgs);
            return mockNot();
          },
        };
      },
    })),
  },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

// Import bcrypt after mock is set up
import bcrypt from "bcryptjs";

describe("ScoreService", () => {
  let service: ScoreService;

  beforeEach(() => {
    service = new ScoreService();
    vi.clearAllMocks();
  });

  describe("getPlayerRecord", () => {
    it("returns mapped record when data exists", async () => {
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

      const result = await service.getPlayerRecord("Alice");

      expect(result).toEqual({
        playerName: "Alice",
        score: 50,
        percentage: 78,
        totalQuestions: 64,
        elapsedSeconds: 1200,
        completedAt: "2026-01-01T00:00:00Z",
      });
      expect(mockRpc).toHaveBeenCalledWith("get_player_top_score", {
        target_player_name: "Alice",
      });
    });

    it("returns null when no data found", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });
      const result = await service.getPlayerRecord("Unknown");
      expect(result).toBeNull();
    });

    it("returns null when data is null", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });
      const result = await service.getPlayerRecord("Unknown");
      expect(result).toBeNull();
    });

    it("throws 502 on supabase error", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "db error" } });

      await expect(service.getPlayerRecord("Alice")).rejects.toThrow(AppError);
      await expect(service.getPlayerRecord("Alice")).rejects.toMatchObject({
        statusCode: 502,
        code: "SUPABASE_READ_FAILED",
      });
    });

    it("normalizes player name before query", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });
      await service.getPlayerRecord("  Alice  ");
      expect(mockRpc).toHaveBeenCalledWith("get_player_top_score", {
        target_player_name: "Alice",
      });
    });
  });

  describe("resetScores", () => {
    it("completes happy path: verify PIN, count, delete", async () => {
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const { supabase } = await import("../lib/supabase.js");
      const callCounts: Record<string, number> = {};
      vi.mocked(supabase.from).mockImplementation(((table: string) => {
        if (table === "app_admin_settings") {
          return {
            select: () => ({
              eq: () => ({
                single: () =>
                  Promise.resolve({
                    data: { reset_pin_hash: "$2a$10$hashedvalue" },
                    error: null,
                  }),
              }),
            }),
          };
        }

        callCounts[table] = (callCounts[table] ?? 0) + 1;
        if (callCounts[table] === 1) {
          return {
            select: () =>
              Promise.resolve({
                count: table === "score_attempts" ? 3 : 5,
                error: null,
              }),
          };
        }

        return {
          delete: () => ({
            not: () => Promise.resolve({ error: null }),
          }),
        };
      }) as typeof supabase.from);

      const result = await service.resetScores("1234");

      expect(result.deletedCount).toBe(5);
      expect(result.deletedAttemptCount).toBe(3);
      expect(result.resetAt).toBeDefined();
    });

    it("throws 502 when settings lookup fails", async () => {
      const { supabase } = await import("../lib/supabase.js");
      vi.mocked(supabase.from).mockImplementation((() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: "db error" } }),
          }),
        }),
      })) as typeof supabase.from);

      await expect(service.resetScores("1234")).rejects.toMatchObject({
        statusCode: 502,
        code: "RESET_PIN_LOOKUP_FAILED",
      });
    });

    it("throws 409 when PIN hash is not configured", async () => {
      const { supabase } = await import("../lib/supabase.js");
      vi.mocked(supabase.from).mockImplementation((() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { reset_pin_hash: null }, error: null }),
          }),
        }),
      })) as typeof supabase.from);

      await expect(service.resetScores("1234")).rejects.toMatchObject({
        statusCode: 409,
        code: "RESET_PIN_NOT_CONFIGURED",
      });
    });

    it("throws 401 when PIN does not match", async () => {
      const { supabase } = await import("../lib/supabase.js");
      vi.mocked(supabase.from).mockImplementation((() => ({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: { reset_pin_hash: "$2a$10$hash" }, error: null }),
          }),
        }),
      })) as typeof supabase.from);

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(service.resetScores("wrong")).rejects.toMatchObject({
        statusCode: 401,
        code: "INVALID_RESET_PIN",
      });
    });
  });
});
