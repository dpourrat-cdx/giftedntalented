import { AttemptService } from "./attempt.service.js";
import { AppError } from "../utils/errors.js";

const mockRpc = vi.fn();
const mockSingle = vi.fn();
const mockInsertSingle = vi.fn();
const mockUpdateEq = vi.fn();
const mockEventInsert = vi.fn();

vi.mock("../lib/supabase.js", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: vi.fn((table: string) => {
      if (table === "score_attempt_events") {
        return {
          insert: (...args: unknown[]) => mockEventInsert(...args),
        };
      }

      return {
        select: () => ({
          eq: () => ({
            single: () => mockSingle(),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => mockInsertSingle(),
          }),
        }),
        update: () => ({
          eq: (...args: unknown[]) => mockUpdateEq(...args),
        }),
      };
    }),
  },
}));

vi.mock("../lib/question-bank.js", () => ({
  getLoadedQuestionBank: vi.fn(),
}));

vi.mock("../config/logger.js", () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    child: vi.fn(() => ({ warn: vi.fn(), info: vi.fn(), error: vi.fn() })),
  },
}));

import { getLoadedQuestionBank } from "../lib/question-bank.js";

// 2 sections × 2 questions per section = 4 total expected for web clients.
// q5 is an extra Math question used to test wrong section distribution.
const MOCK_BANK = {
  sections: ["Math", "Verbal"],
  questionsPerTestSection: 2,
  questionIndex: new Map([
    ["q1", { bankId: "q1", section: "Math", prompt: "Q1", options: ["A", "B", "C", "D"], answer: 0, explanation: "" }],
    ["q2", { bankId: "q2", section: "Math", prompt: "Q2", options: ["A", "B", "C", "D"], answer: 1, explanation: "" }],
    ["q5", { bankId: "q5", section: "Math", prompt: "Q5", options: ["A", "B", "C", "D"], answer: 0, explanation: "" }],
    ["q3", { bankId: "q3", section: "Verbal", prompt: "Q3", options: ["A", "B", "C", "D"], answer: 2, explanation: "" }],
    ["q4", { bankId: "q4", section: "Verbal", prompt: "Q4", options: ["A", "B", "C", "D"], answer: 3, explanation: "" }],
  ]),
};

// Valid 4-question set: 2 Math + 2 Verbal with options matching the bank.
// correctAnswers: q1→0, q2→1, q3→2, q4→3 (indexOf correctOption in provided options)
const VALID_QUESTIONS = [
  { questionId: 1, bankId: "q1", options: ["A", "B", "C", "D"] },
  { questionId: 2, bankId: "q2", options: ["A", "B", "C", "D"] },
  { questionId: 3, bankId: "q3", options: ["A", "B", "C", "D"] },
  { questionId: 4, bankId: "q4", options: ["A", "B", "C", "D"] },
];

// 3 Math + 1 Verbal — passes the count check (total=4) but fails section distribution.
const WRONG_DISTRIBUTION_QUESTIONS = [
  { questionId: 1, bankId: "q1", options: ["A", "B", "C", "D"] },
  { questionId: 2, bankId: "q2", options: ["A", "B", "C", "D"] },
  { questionId: 3, bankId: "q5", options: ["A", "B", "C", "D"] },
  { questionId: 4, bankId: "q3", options: ["A", "B", "C", "D"] },
];

// The question_key row as stored in the DB after startAttempt.
const STORED_QUESTION_KEY = [
  { questionId: 1, bankId: "q1", correctAnswer: 0, section: "Math" },
  { questionId: 2, bankId: "q2", correctAnswer: 1, section: "Math" },
  { questionId: 3, bankId: "q3", correctAnswer: 2, section: "Verbal" },
  { questionId: 4, bankId: "q4", correctAnswer: 3, section: "Verbal" },
];

const ATTEMPT_ID = "11111111-1111-1111-1111-111111111111";

function makeAttemptRow(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: ATTEMPT_ID,
      player_name: "Alice",
      client_type: "web",
      mode: "quiz",
      total_questions: 4,
      question_key: STORED_QUESTION_KEY,
      answers: [null, null, null, null],
      started_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      completed_at: null,
      expires_at: "2099-01-01T00:00:00Z",
      last_elapsed_seconds: null,
      ...overrides,
    },
    error: null,
  };
}

function makeSavedScoreRecord(overrides: Record<string, unknown> = {}) {
  return {
    player_name: "Alice",
    score: 1,
    percentage: 25,
    total_questions: 4,
    elapsed_seconds: null,
    completed_at: null,
    ...overrides,
  };
}

function makeScoreSavePayload(overrides: Record<string, unknown> = {}) {
  const record = makeSavedScoreRecord(overrides) as {
    player_name: string;
    score: number;
    percentage: number;
    total_questions: number;
    elapsed_seconds: number | null;
    completed_at: string | null;
  };

  return {
    record,
    audit: {
      attemptId: ATTEMPT_ID,
      playerName: "Alice",
      clientType: "web",
      selectionFingerprint: "fingerprint",
      oldBest: null,
      newBest: record,
      replacedBest: true,
      savedAt: "2026-01-01T00:00:00Z",
      score: record.score,
      percentage: record.percentage,
      totalQuestions: record.total_questions,
      elapsedSeconds: record.elapsed_seconds,
    },
  };
}

describe("AttemptService", () => {
  let service: AttemptService;

  beforeEach(() => {
    service = new AttemptService();
    vi.mocked(getLoadedQuestionBank).mockResolvedValue(MOCK_BANK as never);
    mockUpdateEq.mockResolvedValue({ error: null });
    mockEventInsert.mockResolvedValue({ error: null });
  });

  describe("startAttempt", () => {
    it("returns storyOnly without DB call for story mode", async () => {
      const result = await service.startAttempt({
        playerName: "Alice",
        clientType: "web",
        mode: "story",
      });

      expect(result).toEqual({ storyOnly: true, attemptId: null, totalQuestions: 0, questions: [] });
      expect(mockInsertSingle).not.toHaveBeenCalled();
    });

    it("inserts attempt row and returns attemptId for valid quiz input", async () => {
      mockInsertSingle.mockResolvedValue({
        data: { id: ATTEMPT_ID, total_questions: 4, expires_at: "2099-01-01T00:00:00Z" },
        error: null,
      });

      const result = await service.startAttempt({
        playerName: "Alice",
        clientType: "web",
        mode: "quiz",
        questions: VALID_QUESTIONS,
      });

      expect(result.storyOnly).toBe(false);
      expect(result.attemptId).toBe(ATTEMPT_ID);
      expect(result.totalQuestions).toBe(4);
      expect(result.questions).toHaveLength(4);
      expect(mockEventInsert).toHaveBeenCalledOnce();
    });

    it("generates backend-owned questions when the client omits the quiz payload", async () => {
      mockInsertSingle.mockResolvedValue({
        data: { id: ATTEMPT_ID, total_questions: 4, expires_at: "2099-01-01T00:00:00Z" },
        error: null,
      });

      const result = await service.startAttempt({
        playerName: "Alice",
        clientType: "web",
        mode: "quiz",
      });

      expect(result.storyOnly).toBe(false);
      expect(result.questions).toHaveLength(4);
      expect(result.questions.map((question) => question.prompt).sort()).toEqual(["Q1", "Q2", "Q3", "Q4"]);
      expect(result.questions.every((question) => question.options.length === 4)).toBe(true);
    });

    it("throws 400 when question count does not match expected total (web)", async () => {
      await expect(
        service.startAttempt({
          playerName: "Alice",
          clientType: "web",
          mode: "quiz",
          questions: VALID_QUESTIONS.slice(0, 2),
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: "ATTEMPT_SHAPE_INVALID" });
    });

    it("throws 400 for duplicate bankId", async () => {
      await expect(
        service.startAttempt({
          playerName: "Alice",
          clientType: "web",
          mode: "quiz",
          questions: [
            { questionId: 1, bankId: "q1", options: ["A", "B", "C", "D"] },
            { questionId: 2, bankId: "q1", options: ["A", "B", "C", "D"] }, // duplicate
            { questionId: 3, bankId: "q3", options: ["A", "B", "C", "D"] },
            { questionId: 4, bankId: "q4", options: ["A", "B", "C", "D"] },
          ],
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: "ATTEMPT_SHAPE_INVALID" });
    });

    it("throws 400 for unknown bankId", async () => {
      await expect(
        service.startAttempt({
          playerName: "Alice",
          clientType: "web",
          mode: "quiz",
          questions: [
            { questionId: 1, bankId: "unknown", options: ["A", "B", "C", "D"] },
            ...VALID_QUESTIONS.slice(1),
          ],
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: "ATTEMPT_SHAPE_INVALID" });
    });

    it("throws 400 when options do not match the canonical question bank", async () => {
      await expect(
        service.startAttempt({
          playerName: "Alice",
          clientType: "web",
          mode: "quiz",
          questions: [
            { questionId: 1, bankId: "q1", options: ["X", "Y", "Z", "W"] }, // wrong options
            ...VALID_QUESTIONS.slice(1),
          ],
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: "ATTEMPT_SHAPE_INVALID" });
    });

    it("throws 400 when section distribution does not match expected shape (web)", async () => {
      await expect(
        service.startAttempt({
          playerName: "Alice",
          clientType: "web",
          mode: "quiz",
          questions: WRONG_DISTRIBUTION_QUESTIONS,
        }),
      ).rejects.toMatchObject({ statusCode: 400, code: "ATTEMPT_SHAPE_INVALID" });
    });

    it("throws 502 on DB insert error", async () => {
      mockInsertSingle.mockResolvedValue({ data: null, error: { message: "db error" } });

      await expect(
        service.startAttempt({
          playerName: "Alice",
          clientType: "web",
          mode: "quiz",
          questions: VALID_QUESTIONS,
        }),
      ).rejects.toMatchObject({ statusCode: 502, code: "ATTEMPT_CREATE_FAILED" });
    });

    it("retries start without expires_at when the schema cache is stale", async () => {
      mockInsertSingle
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: "PGRST204",
            message: "Could not find the 'expires_at' column of 'score_attempts' in the schema cache",
          },
        })
        .mockResolvedValueOnce({
          data: { id: ATTEMPT_ID, total_questions: 4 },
          error: null,
        });

      const result = await service.startAttempt({
        playerName: "Alice",
        clientType: "web",
        mode: "quiz",
        questions: VALID_QUESTIONS,
      });

      expect(result.attemptId).toBe(ATTEMPT_ID);
      expect(mockInsertSingle).toHaveBeenCalledTimes(2);
    });
  });

  describe("submitAnswer", () => {
    it("accepts a new correct answer, writes to DB, and returns a preview record", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow());

      const result = await service.submitAnswer(ATTEMPT_ID, {
        questionId: 1,
        bankId: "q1",
        selectedAnswer: 0, // correct
        elapsedSeconds: 30,
      });

      expect(result.accepted).toBe(true);
      expect(result.progress.correctCount).toBe(1);
      expect(result.progress.answeredCount).toBe(1);
      expect(result.record).toBeDefined();
      expect(mockUpdateEq).toHaveBeenCalledOnce();
      expect(mockRpc).not.toHaveBeenCalled();
      expect(mockEventInsert).toHaveBeenCalledOnce();
    });

    it("records a wrong answer without returning a preview record", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow());

      const result = await service.submitAnswer(ATTEMPT_ID, {
        questionId: 1,
        bankId: "q1",
        selectedAnswer: 1, // wrong (correct is 0)
      });

      expect(result.accepted).toBe(true);
      expect(result.progress.correctCount).toBe(0);
      expect(result.record).toBeNull();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("is idempotent when the same answer is resubmitted", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow({ answers: [0, null, null, null] }));

      const result = await service.submitAnswer(ATTEMPT_ID, {
        questionId: 1,
        bankId: "q1",
        selectedAnswer: 0, // same as stored
      });

      expect(result.accepted).toBe(true);
      expect(mockUpdateEq).not.toHaveBeenCalled(); // no re-write
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("throws 409 when attempt is already completed", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow({ completed_at: "2026-01-01T00:00:00Z" }));

      await expect(
        service.submitAnswer(ATTEMPT_ID, { questionId: 1, bankId: "q1", selectedAnswer: 0 }),
      ).rejects.toMatchObject({ statusCode: 409, code: "ATTEMPT_ALREADY_COMPLETED" });
    });

    it("throws 409 when the attempt is expired", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow({ expires_at: "2025-01-01T00:00:00Z" }));

      await expect(
        service.submitAnswer(ATTEMPT_ID, { questionId: 1, bankId: "q1", selectedAnswer: 0 }),
      ).rejects.toMatchObject({ statusCode: 409, code: "ATTEMPT_EXPIRED" });
    });

    it("throws 409 when answer is locked to a different value", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow({ answers: [0, null, null, null] }));

      await expect(
        service.submitAnswer(ATTEMPT_ID, { questionId: 1, bankId: "q1", selectedAnswer: 1 }),
      ).rejects.toMatchObject({ statusCode: 409, code: "ATTEMPT_ANSWER_LOCKED" });
    });

    it("throws 400 when questionId is not in this attempt", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow());

      await expect(
        service.submitAnswer(ATTEMPT_ID, { questionId: 99, bankId: "q1", selectedAnswer: 0 }),
      ).rejects.toMatchObject({ statusCode: 400, code: "ATTEMPT_ANSWER_INVALID" });
    });

    it("throws 404 when attempt does not exist", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "not found" } });

      await expect(
        service.submitAnswer(ATTEMPT_ID, { questionId: 1, bankId: "q1", selectedAnswer: 0 }),
      ).rejects.toMatchObject({ statusCode: 404, code: "ATTEMPT_NOT_FOUND" });
    });

    it("throws 502 on DB write error", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow());
      mockUpdateEq.mockResolvedValue({ error: { message: "write error" } });

      await expect(
        service.submitAnswer(ATTEMPT_ID, { questionId: 1, bankId: "q1", selectedAnswer: 0 }),
      ).rejects.toMatchObject({ statusCode: 502, code: "ATTEMPT_WRITE_FAILED" });
    });

    it("retries lookup without expires_at when the schema cache is stale", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: "PGRST204",
            message: "Could not find the 'expires_at' column of 'score_attempts' in the schema cache",
          },
        })
        .mockResolvedValueOnce(
          makeAttemptRow({
            started_at: "2099-01-01T00:00:00Z",
            updated_at: "2099-01-01T00:00:00Z",
            expires_at: undefined,
          }),
        );
      const result = await service.submitAnswer(ATTEMPT_ID, {
        questionId: 1,
        bankId: "q1",
        selectedAnswer: 0,
      });

      expect(result.accepted).toBe(true);
      expect(mockSingle).toHaveBeenCalledTimes(2);
    });

    it("retries lookup without expires_at when Postgres reports the column is missing", async () => {
      mockSingle
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: "42703",
            message: "column score_attempts.expires_at does not exist",
          },
        })
        .mockResolvedValueOnce(
          makeAttemptRow({
            started_at: "2099-01-01T00:00:00Z",
            updated_at: "2099-01-01T00:00:00Z",
            expires_at: undefined,
          }),
        );
      const result = await service.submitAnswer(ATTEMPT_ID, {
        questionId: 1,
        bankId: "q1",
        selectedAnswer: 0,
      });

      expect(result.accepted).toBe(true);
      expect(mockSingle).toHaveBeenCalledTimes(2);
    });
  });

  describe("finalizeAttempt", () => {
    it("marks attempt complete and saves final score", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow({ answers: [0, 1, 2, 3] })); // all correct
      mockRpc
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: {
            record: makeSavedScoreRecord({
              score: 4,
              percentage: 100,
              total_questions: 4,
              elapsed_seconds: 60,
              completed_at: "2026-01-01T00:00:00Z",
            }),
            audit: {
              attemptId: ATTEMPT_ID,
              playerName: "Alice",
              clientType: "web",
              selectionFingerprint: "fingerprint",
              oldBest: null,
              newBest: makeSavedScoreRecord({
                score: 4,
                percentage: 100,
                total_questions: 4,
                elapsed_seconds: 60,
                completed_at: "2026-01-01T00:00:00Z",
              }),
              replacedBest: true,
              savedAt: "2026-01-01T00:00:00Z",
              score: 4,
              percentage: 100,
              totalQuestions: 4,
              elapsedSeconds: 60,
            },
          },
          error: null,
        });

      const result = await service.finalizeAttempt(ATTEMPT_ID, { elapsedSeconds: 60 });

      expect(result.finalized).toBe(true);
      expect(result.progress.correctCount).toBe(4);
      expect(result.progress.percentage).toBe(100);
      expect(mockUpdateEq).toHaveBeenCalledOnce(); // sets completed_at
      expect(mockRpc).toHaveBeenCalledTimes(2);
      expect(mockEventInsert).toHaveBeenCalledOnce();
    });

    it("returns the stored score payload without saving again", async () => {
      mockSingle.mockResolvedValue(
        makeAttemptRow({
          answers: [0, null, null, null],
          completed_at: "2026-01-01T00:00:00Z",
          score_saved_payload: makeScoreSavePayload({
            score: 1,
            percentage: 25,
            total_questions: 4,
            elapsed_seconds: null,
            completed_at: "2026-01-01T00:00:00Z",
          }),
        }),
      );

      const result = await service.finalizeAttempt(ATTEMPT_ID, {});

      expect(result.finalized).toBe(true);
      expect(mockUpdateEq).not.toHaveBeenCalled();
      expect(mockRpc).not.toHaveBeenCalled();
      expect(result.record).toEqual({
        playerName: "Alice",
        score: 1,
        percentage: 25,
        totalQuestions: 4,
        elapsedSeconds: null,
        completedAt: "2026-01-01T00:00:00Z",
      });
    });

    it("falls back to legacy score saving and persists structured metadata", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow({ answers: [0, 1, 2, 3] }));
      mockRpc
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({
          data: null,
          error: {
            code: "PGRST202",
            message: "Could not find the function public.save_attempt_score_from_attempt",
          },
        })
        .mockResolvedValueOnce({
          data: makeSavedScoreRecord({
            score: 4,
            percentage: 100,
            total_questions: 4,
            elapsed_seconds: 60,
            completed_at: "2026-01-01T00:00:00Z",
          }),
          error: null,
        });

      const result = await service.finalizeAttempt(ATTEMPT_ID, { elapsedSeconds: 60 });

      expect(result.finalized).toBe(true);
      expect(mockRpc).toHaveBeenCalledTimes(3);
      expect(mockUpdateEq).toHaveBeenCalledTimes(2);
      expect(mockEventInsert).toHaveBeenCalledTimes(2);
    });

    it("throws 404 when attempt does not exist", async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116", message: "not found" } });

      await expect(service.finalizeAttempt(ATTEMPT_ID, {})).rejects.toMatchObject({
        statusCode: 404,
        code: "ATTEMPT_NOT_FOUND",
      });
    });

    it("throws 502 on DB finalize error", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow({ answers: [0, null, null, null] }));
      mockUpdateEq.mockResolvedValue({ error: { message: "db error" } });

      await expect(service.finalizeAttempt(ATTEMPT_ID, { elapsedSeconds: 30 })).rejects.toMatchObject({
        statusCode: 502,
        code: "ATTEMPT_FINALIZE_FAILED",
      });
    });

    it("throws 409 when finalize is attempted after expiry", async () => {
      mockSingle.mockResolvedValue(makeAttemptRow({ expires_at: "2025-01-01T00:00:00Z" }));

      await expect(service.finalizeAttempt(ATTEMPT_ID, { elapsedSeconds: 30 })).rejects.toMatchObject({
        statusCode: 409,
        code: "ATTEMPT_EXPIRED",
      });
    });
  });
});
