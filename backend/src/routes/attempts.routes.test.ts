import request from "supertest";
import { AppError } from "../utils/errors.js";
import { buildApp } from "../app.js";

const mockAttemptService = vi.hoisted(() => ({
  startAttempt: vi.fn(),
  submitAnswer: vi.fn(),
  finalizeAttempt: vi.fn(),
}));

const ATTEMPT_ID = "550e8400-e29b-41d4-a716-446655440000";

vi.mock("../services/attempt.service.js", () => ({
  AttemptService: vi.fn(() => mockAttemptService),
}));

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    rpc: vi.fn(),
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

vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

vi.mock("pino-http", () => {
  const middleware = (_req: unknown, _res: unknown, next: () => void) => next();
  return { default: () => middleware };
});

vi.mock("../config/logger.js", () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    child: vi.fn(() => ({ info: vi.fn(), error: vi.fn() })),
  },
}));

describe("Attempts routes", () => {
  let app: ReturnType<typeof buildApp>;

  beforeEach(() => {
    app = buildApp();
    vi.clearAllMocks();
  });

  describe("POST /api/v1/attempts", () => {
    const validQuestions = [
      { questionId: 1, bankId: "q1", options: ["A", "B", "C", "D"] },
    ];

    it("returns 201 for a quiz attempt", async () => {
      mockAttemptService.startAttempt.mockResolvedValue({
        storyOnly: false,
        attemptId: ATTEMPT_ID,
        totalQuestions: 1,
      });

      const response = await request(app).post("/api/v1/attempts").send({
        playerName: "Alice",
        clientType: "web",
        mode: "quiz",
        questions: validQuestions,
      });

      expect(response.status).toBe(201);
      expect(response.body.attemptId).toBe(ATTEMPT_ID);
      expect(response.body.requestId).toBeDefined();
      expect(mockAttemptService.startAttempt).toHaveBeenCalledOnce();
      expect(mockAttemptService.startAttempt).toHaveBeenCalledWith(
        expect.objectContaining({
          playerName: "Alice",
          clientType: "web",
          mode: "quiz",
        }),
      );
    });

    it("returns 200 for a story-only attempt", async () => {
      mockAttemptService.startAttempt.mockResolvedValue({
        storyOnly: true,
        attemptId: null,
        totalQuestions: 0,
      });

      const response = await request(app).post("/api/v1/attempts").send({
        playerName: "Alice",
        clientType: "web",
        mode: "story",
        questions: validQuestions,
      });

      expect(response.status).toBe(200);
      expect(response.body.storyOnly).toBe(true);
      expect(response.body.attemptId).toBeNull();
      expect(response.body.requestId).toBeDefined();
    });

    it("returns 400 when the payload is invalid", async () => {
      const response = await request(app).post("/api/v1/attempts").send({
        playerName: "Alice",
        clientType: "web",
        mode: "quiz",
        questions: [],
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("VALIDATION_ERROR");
      expect(mockAttemptService.startAttempt).not.toHaveBeenCalled();
    });
  });

  describe("POST /api/v1/attempts/:attemptId/answers", () => {
    it("returns 201 and forwards the answer to the service", async () => {
      mockAttemptService.submitAnswer.mockResolvedValue({
        accepted: true,
        progress: {
          answeredCount: 1,
          correctCount: 1,
          totalQuestions: 4,
          percentage: 25,
        },
        record: null,
      });

      const response = await request(app)
        .post(`/api/v1/attempts/${ATTEMPT_ID}/answers`)
        .send({
          questionId: 1,
          bankId: "q1",
          selectedAnswer: 0,
          elapsedSeconds: 42,
        });

      expect(response.status).toBe(201);
      expect(response.body.accepted).toBe(true);
      expect(response.body.requestId).toBeDefined();
      expect(mockAttemptService.submitAnswer).toHaveBeenCalledWith(
        ATTEMPT_ID,
        expect.objectContaining({
          questionId: 1,
          bankId: "q1",
          selectedAnswer: 0,
        }),
      );
    });

    it("returns 400 for an invalid request body", async () => {
      const response = await request(app)
        .post(`/api/v1/attempts/${ATTEMPT_ID}/answers`)
        .send({
          questionId: 1,
          bankId: "q1",
          selectedAnswer: 4,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("VALIDATION_ERROR");
      expect(mockAttemptService.submitAnswer).not.toHaveBeenCalled();
    });

    it("returns the service error status when the attempt is missing", async () => {
      mockAttemptService.submitAnswer.mockRejectedValue(
        new AppError(404, "ATTEMPT_NOT_FOUND", "The saved score attempt could not be found."),
      );

      const response = await request(app)
        .post(`/api/v1/attempts/${ATTEMPT_ID}/answers`)
        .send({
          questionId: 1,
          bankId: "q1",
          selectedAnswer: 0,
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("ATTEMPT_NOT_FOUND");
    });
  });

  describe("POST /api/v1/attempts/:attemptId/finalize", () => {
    it("returns 200 and finalizes the attempt", async () => {
      mockAttemptService.finalizeAttempt.mockResolvedValue({
        finalized: true,
        progress: {
          answeredCount: 4,
          correctCount: 4,
          totalQuestions: 4,
          percentage: 100,
        },
        record: null,
      });

      const response = await request(app)
        .post(`/api/v1/attempts/${ATTEMPT_ID}/finalize`)
        .send({
          elapsedSeconds: 75,
        });

      expect(response.status).toBe(200);
      expect(response.body.finalized).toBe(true);
      expect(response.body.requestId).toBeDefined();
      expect(mockAttemptService.finalizeAttempt).toHaveBeenCalledWith(
        ATTEMPT_ID,
        expect.objectContaining({
          elapsedSeconds: 75,
        }),
      );
    });
  });
});
