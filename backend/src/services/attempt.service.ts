import { getLoadedQuestionBank } from "../lib/question-bank.js";
import { logger } from "../config/logger.js";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { normalizeElapsedSeconds, normalizePlayerName } from "../utils/normalize.js";

const ATTEMPT_TTL_HOURS = 2;

type StartAttemptInput = {
  playerName: string;
  clientType: "web" | "android";
  mode: "quiz" | "story";
  questions: {
    questionId: number;
    bankId: string;
    options: string[];
  }[];
};

type SubmitAnswerInput = {
  questionId: number;
  bankId: string;
  selectedAnswer: number;
  elapsedSeconds?: number | null;
};

type FinalizeAttemptInput = {
  elapsedSeconds?: number | null;
};

type AttemptQuestionKey = {
  questionId: number;
  bankId: string;
  correctAnswer: number;
  section: string;
};

type ScoreAttemptRow = {
  id: string;
  player_name: string;
  client_type: "web" | "android";
  mode: "quiz" | "story";
  total_questions: number;
  question_key: unknown;
  answers: unknown;
  started_at: string;
  updated_at: string;
  completed_at: string | null;
  expires_at: string | null;
  last_elapsed_seconds: number | null;
};

type AttemptEventType = "attempt_started" | "answer_accepted" | "attempt_finalized" | "score_saved";

function addHoursIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function mapScoreRow(row: Record<string, unknown>) {
  return {
    playerName: row.player_name,
    score: row.score,
    percentage: row.percentage,
    totalQuestions: row.total_questions,
    elapsedSeconds: row.elapsed_seconds,
    completedAt: row.completed_at,
  };
}

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function hasSameOptions(providedOptions: string[], expectedOptions: string[]) {
  if (providedOptions.length !== expectedOptions.length) {
    return false;
  }

  const normalizedProvided = [...providedOptions].sort();
  const normalizedExpected = [...expectedOptions].sort();
  return normalizedProvided.every((value, index) => value === normalizedExpected[index]);
}

function isAttemptQuestionKey(value: unknown): value is AttemptQuestionKey {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.questionId === "number" &&
    Number.isInteger(candidate.questionId) &&
    typeof candidate.bankId === "string" &&
    typeof candidate.correctAnswer === "number" &&
    Number.isInteger(candidate.correctAnswer) &&
    candidate.correctAnswer >= 0 &&
    candidate.correctAnswer <= 3 &&
    typeof candidate.section === "string"
  );
}

function parseQuestionKey(value: unknown, totalQuestions: number) {
  if (!Array.isArray(value) || value.length !== totalQuestions || !value.every(isAttemptQuestionKey)) {
    throw new AppError(500, "ATTEMPT_STATE_INVALID", "The saved attempt question key is invalid.");
  }

  return value as AttemptQuestionKey[];
}

function parseAnswers(value: unknown, totalQuestions: number) {
  if (!Array.isArray(value) || value.length !== totalQuestions) {
    throw new AppError(500, "ATTEMPT_STATE_INVALID", "The saved attempt answer state is invalid.");
  }

  const normalizedAnswers = value.map((entry) => {
    if (entry === null) {
      return null;
    }

    if (typeof entry !== "number" || !Number.isInteger(entry) || entry < 0 || entry > 3) {
      throw new AppError(500, "ATTEMPT_STATE_INVALID", "The saved attempt answers are invalid.");
    }

    return entry;
  });

  return normalizedAnswers;
}

function computeAttemptProgress(questionKey: AttemptQuestionKey[], answers: Array<number | null>) {
  let answeredCount = 0;
  let correctCount = 0;

  answers.forEach((answer, index) => {
    if (answer === null) {
      return;
    }

    answeredCount += 1;
    if (answer === questionKey[index].correctAnswer) {
      correctCount += 1;
    }
  });

  const totalQuestions = questionKey.length;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return {
    answeredCount,
    correctCount,
    totalQuestions,
    percentage,
  };
}

function isExpired(expiresAt: string | null) {
  return typeof expiresAt === "string" && Date.parse(expiresAt) <= Date.now();
}

export class AttemptService {
  private async recordAttemptEvent(args: {
    attemptId: string;
    eventType: AttemptEventType;
    playerName: string;
    clientType: "web" | "android";
    metadata?: Record<string, unknown>;
  }) {
    const { error } = await supabase.from("score_attempt_events").insert({
      attempt_id: args.attemptId,
      event_type: args.eventType,
      player_name: normalizePlayerName(args.playerName),
      client_type: args.clientType,
      metadata: args.metadata ?? {},
    });

    if (error) {
      logger.warn(
        {
          error,
          attemptId: args.attemptId,
          eventType: args.eventType,
        },
        "Score attempt event could not be recorded.",
      );
    }
  }

  private async saveAuthoritativeScore(args: {
    attemptId: string;
    playerName: string;
    clientType: "web" | "android";
    correctCount: number;
    totalQuestions: number;
    elapsedSeconds: number | null;
  }) {
    if (args.correctCount <= 0) {
      return null;
    }

    const { data, error } = await supabase.rpc("save_player_score", {
      target_player_name: normalizePlayerName(args.playerName),
      score: args.correctCount,
      percentage: Math.round((args.correctCount / args.totalQuestions) * 100),
      total_questions: args.totalQuestions,
      elapsed_seconds: normalizeElapsedSeconds(args.elapsedSeconds),
    });

    if (error) {
      throw new AppError(502, "SUPABASE_WRITE_FAILED", "The score record could not be saved.", error);
    }

    await this.recordAttemptEvent({
      attemptId: args.attemptId,
      eventType: "score_saved",
      playerName: args.playerName,
      clientType: args.clientType,
      metadata: {
        score: data.score,
        percentage: data.percentage,
        totalQuestions: data.total_questions,
        elapsedSeconds: data.elapsed_seconds,
      },
    });

    return mapScoreRow(data);
  }

  private async getAttemptRow(attemptId: string) {
    const { data, error } = await supabase
      .from("score_attempts")
      .select(
        "id, player_name, client_type, mode, total_questions, question_key, answers, started_at, updated_at, completed_at, expires_at, last_elapsed_seconds",
      )
      .eq("id", attemptId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new AppError(404, "ATTEMPT_NOT_FOUND", "The saved score attempt could not be found.");
      }

      throw new AppError(502, "ATTEMPT_READ_FAILED", "The score attempt could not be loaded.", error);
    }

    return data as ScoreAttemptRow;
  }

  private assertAttemptIsActive(attempt: ScoreAttemptRow) {
    if (!attempt.completed_at && isExpired(attempt.expires_at)) {
      throw new AppError(409, "ATTEMPT_EXPIRED", "This score attempt has expired.");
    }
  }

  async startAttempt(input: StartAttemptInput) {
    if (input.mode === "story") {
      return {
        storyOnly: true,
        attemptId: null,
        totalQuestions: 0,
      };
    }

    const questionBank = await getLoadedQuestionBank();
    const normalizedName = normalizePlayerName(input.playerName);
    const questions = [...input.questions].sort((left, right) => left.questionId - right.questionId);
    const questionIds = new Set<number>();
    const bankIds = new Set<string>();
    const sectionCounts = new Map<string, number>();
    const expectedTotalQuestions = questionBank.sections.length * questionBank.questionsPerTestSection;

    if (input.clientType === "web" && questions.length !== expectedTotalQuestions) {
      throw new AppError(400, "ATTEMPT_SHAPE_INVALID", "The attempt did not include the expected number of questions.");
    }

    const questionKey = questions.map((question, index) => {
      if (question.questionId !== index + 1 || questionIds.has(question.questionId)) {
        throw new AppError(400, "ATTEMPT_SHAPE_INVALID", "The attempt question order is invalid.");
      }

      if (bankIds.has(question.bankId)) {
        throw new AppError(400, "ATTEMPT_SHAPE_INVALID", "The attempt included duplicate bank questions.");
      }

      const canonicalQuestion = questionBank.questionIndex.get(question.bankId);
      if (!canonicalQuestion) {
        throw new AppError(400, "ATTEMPT_SHAPE_INVALID", "The attempt included an unknown bank question.");
      }

      if (uniqueStrings(question.options).length !== 4 || !hasSameOptions(question.options, canonicalQuestion.options)) {
        throw new AppError(400, "ATTEMPT_SHAPE_INVALID", "The attempt options did not match the canonical question bank.");
      }

      const correctOption = canonicalQuestion.options[canonicalQuestion.answer];
      const correctAnswer = question.options.indexOf(correctOption);
      if (correctAnswer === -1) {
        throw new AppError(400, "ATTEMPT_SHAPE_INVALID", "The attempt options could not be verified.");
      }

      questionIds.add(question.questionId);
      bankIds.add(question.bankId);
      sectionCounts.set(canonicalQuestion.section, (sectionCounts.get(canonicalQuestion.section) ?? 0) + 1);

      return {
        questionId: question.questionId,
        bankId: question.bankId,
        correctAnswer,
        section: canonicalQuestion.section,
      };
    });

    if (input.clientType === "web") {
      const hasExpectedSectionShape = questionBank.sections.every((section) => {
        return (sectionCounts.get(section) ?? 0) === questionBank.questionsPerTestSection;
      });

      if (!hasExpectedSectionShape) {
        throw new AppError(400, "ATTEMPT_SHAPE_INVALID", "The attempt did not include the expected mission distribution.");
      }
    }

    const emptyAnswers = questionKey.map(() => null);
    const expiresAt = addHoursIso(ATTEMPT_TTL_HOURS);
    const { data, error } = await supabase
      .from("score_attempts")
      .insert({
        player_name: normalizedName,
        client_type: input.clientType,
        mode: input.mode,
        total_questions: questionKey.length,
        question_key: questionKey,
        answers: emptyAnswers,
        expires_at: expiresAt,
        last_elapsed_seconds: null,
      })
      .select("id, total_questions, expires_at")
      .single();

    if (error) {
      throw new AppError(502, "ATTEMPT_CREATE_FAILED", "The score attempt could not be created.", error);
    }

    await this.recordAttemptEvent({
      attemptId: data.id,
      eventType: "attempt_started",
      playerName: normalizedName,
      clientType: input.clientType,
      metadata: {
        mode: input.mode,
        totalQuestions: data.total_questions,
        expiresAt: data.expires_at,
      },
    });

    return {
      storyOnly: false,
      attemptId: data.id,
      totalQuestions: data.total_questions,
    };
  }

  async submitAnswer(attemptId: string, input: SubmitAnswerInput) {
    const attempt = await this.getAttemptRow(attemptId);
    this.assertAttemptIsActive(attempt);
    if (attempt.completed_at) {
      throw new AppError(409, "ATTEMPT_ALREADY_COMPLETED", "This score attempt has already been completed.");
    }

    const questionKey = parseQuestionKey(attempt.question_key, attempt.total_questions);
    const answers = parseAnswers(attempt.answers, attempt.total_questions);
    const slotIndex = questionKey.findIndex((question) => question.questionId === input.questionId);

    if (slotIndex === -1 || questionKey[slotIndex].bankId !== input.bankId) {
      throw new AppError(400, "ATTEMPT_ANSWER_INVALID", "The submitted answer did not match this attempt.");
    }

    if (answers[slotIndex] !== null && answers[slotIndex] !== input.selectedAnswer) {
      throw new AppError(409, "ATTEMPT_ANSWER_LOCKED", "That mission step was already validated.");
    }

    if (answers[slotIndex] === null) {
      answers[slotIndex] = input.selectedAnswer;

      const { error } = await supabase
        .from("score_attempts")
        .update({
          answers,
          last_elapsed_seconds: normalizeElapsedSeconds(input.elapsedSeconds),
        })
        .eq("id", attemptId);

      if (error) {
        throw new AppError(502, "ATTEMPT_WRITE_FAILED", "The validated answer could not be stored.", error);
      }

      await this.recordAttemptEvent({
        attemptId,
        eventType: "answer_accepted",
        playerName: attempt.player_name,
        clientType: attempt.client_type,
        metadata: {
          questionId: input.questionId,
          bankId: input.bankId,
          selectedAnswer: input.selectedAnswer,
          elapsedSeconds: normalizeElapsedSeconds(input.elapsedSeconds),
        },
      });
    }

    const progress = computeAttemptProgress(questionKey, answers);
    const record = await this.saveAuthoritativeScore({
      attemptId,
      playerName: attempt.player_name,
      clientType: attempt.client_type,
      correctCount: progress.correctCount,
      totalQuestions: progress.totalQuestions,
      elapsedSeconds: normalizeElapsedSeconds(input.elapsedSeconds),
    });

    return {
      accepted: true,
      progress,
      record,
    };
  }

  async finalizeAttempt(attemptId: string, input: FinalizeAttemptInput) {
    const attempt = await this.getAttemptRow(attemptId);
    this.assertAttemptIsActive(attempt);
    const questionKey = parseQuestionKey(attempt.question_key, attempt.total_questions);
    const answers = parseAnswers(attempt.answers, attempt.total_questions);

    if (!attempt.completed_at) {
      const finalizedAt = new Date().toISOString();
      const { error } = await supabase
        .from("score_attempts")
        .update({
          completed_at: finalizedAt,
          last_elapsed_seconds: normalizeElapsedSeconds(input.elapsedSeconds),
        })
        .eq("id", attemptId);

      if (error) {
        throw new AppError(502, "ATTEMPT_FINALIZE_FAILED", "The score attempt could not be finalized.", error);
      }

      await this.recordAttemptEvent({
        attemptId,
        eventType: "attempt_finalized",
        playerName: attempt.player_name,
        clientType: attempt.client_type,
        metadata: {
          completedAt: finalizedAt,
          elapsedSeconds: normalizeElapsedSeconds(input.elapsedSeconds),
        },
      });
    }

    const progress = computeAttemptProgress(questionKey, answers);
    const record = await this.saveAuthoritativeScore({
      attemptId,
      playerName: attempt.player_name,
      clientType: attempt.client_type,
      correctCount: progress.correctCount,
      totalQuestions: progress.totalQuestions,
      elapsedSeconds: normalizeElapsedSeconds(input.elapsedSeconds ?? attempt.last_elapsed_seconds),
    });

    return {
      finalized: true,
      progress,
      record,
    };
  }
}
