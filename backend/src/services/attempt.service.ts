import { createHash, randomInt } from "node:crypto";
import { getLoadedQuestionBank } from "../lib/question-bank.js";
import { logger } from "../config/logger.js";
import { supabase } from "../lib/supabase.js";
import { AppError } from "../utils/errors.js";
import { normalizeElapsedSeconds, normalizePlayerName } from "../utils/normalize.js";

const ATTEMPT_TTL_HOURS = 2;
let randomIndexPicker = (max: number) => randomInt(max);

type StartAttemptInput = {
  playerName: string;
  clientType: "web" | "android";
  mode: "quiz" | "story";
  questions?: {
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

type AttemptQuestionResponse = {
  questionId: number;
  bankId: string;
  section: string;
  prompt: string;
  options: string[];
  stimulus?: string;
};

type SelectedAttemptQuestion = AttemptQuestionResponse & {
  correctAnswer: number;
};

type ScoreSaveComparableRow = {
  player_name: string;
  score: number;
  percentage: number;
  total_questions: number;
  elapsed_seconds: number | null;
  completed_at: string | null;
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
  selection_fingerprint: string | null;
  score_saved_at: string | null;
  score_saved_score: number | null;
  score_saved_percentage: number | null;
  score_saved_elapsed_seconds: number | null;
  score_saved_payload: unknown;
  last_elapsed_seconds: number | null;
};

type AttemptEventType = "attempt_started" | "answer_accepted" | "attempt_finalized" | "score_saved";
type SupabaseErrorLike = {
  code?: string;
  message?: string;
};
type AttemptSaveResult = {
  record: ReturnType<typeof mapScoreRow> | null;
  audit: {
    attemptId: string;
    playerName: string;
    clientType: "web" | "android";
    selectionFingerprint: string;
    oldBest: ScoreSaveComparableRow | null;
    newBest: ScoreSaveComparableRow | null;
    replacedBest: boolean;
    savedAt: string;
  };
};
type AttemptSavePayload = {
  record?: Record<string, unknown> | null;
  audit?: AttemptSaveResult["audit"] | null;
};

type LoadedQuestionBank = Awaited<ReturnType<typeof getLoadedQuestionBank>>;
type CanonicalQuestion = LoadedQuestionBank["questionIndex"] extends Map<string, infer Question> ? Question : never;

function addHoursIso(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function addHoursToIso(timestamp: string, hours: number) {
  return new Date(Date.parse(timestamp) + hours * 60 * 60 * 1000).toISOString();
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

function isQuestionBankQuestion(value: unknown): value is CanonicalQuestion {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.bankId === "string" &&
    typeof candidate.section === "string" &&
    typeof candidate.prompt === "string" &&
    Array.isArray(candidate.options) &&
    candidate.options.length === 4 &&
    typeof candidate.answer === "number" &&
    Number.isInteger(candidate.answer) &&
    candidate.answer >= 0 &&
    candidate.answer <= 3
  );
}

function hasSameOptions(providedOptions: string[], expectedOptions: string[]) {
  if (providedOptions.length !== expectedOptions.length) {
    return false;
  }

  const compareText = (left: string, right: string) =>
    left.localeCompare(right, "en", { sensitivity: "variant" });
  const normalizedProvided = [...providedOptions].sort(compareText);
  const normalizedExpected = [...expectedOptions].sort(compareText);
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

function buildSelectionFingerprint(questionKey: AttemptQuestionKey[]) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        questionKey.map((question) => ({
          questionId: question.questionId,
          bankId: question.bankId,
          correctAnswer: question.correctAnswer,
          section: question.section,
        })),
      ),
    )
    .digest("hex");
}

function buildAttemptQuestions(selection: SelectedAttemptQuestion[]): AttemptQuestionResponse[] {
  return selection.map((question) => ({
    questionId: question.questionId,
    bankId: question.bankId,
    section: question.section,
    prompt: question.prompt,
    options: [...question.options],
    ...(question.stimulus ? { stimulus: question.stimulus } : {}),
  }));
}

function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndexPicker(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function setAttemptRandomIndexPickerForTests(
  picker: ((max: number) => number) | null,
) {
  randomIndexPicker = picker ?? ((max: number) => randomInt(max));
}

function buildAnswerSlotPlan(count: number) {
  const slots: number[] = [];

  while (slots.length + 4 <= count) {
    slots.push(0, 1, 2, 3);
  }

  if (slots.length < count) {
    slots.push(...shuffleItems([0, 1, 2, 3]).slice(0, count - slots.length));
  }

  return shuffleItems(slots);
}

function placeCorrectAnswer(question: CanonicalQuestion, targetIndex: number) {
  const correctOption = question.options[question.answer];
  const distractors = shuffleItems(question.options.filter((_, optionIndex) => optionIndex !== question.answer));
  const options: string[] = [];
  let distractorIndex = 0;

  for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
    if (optionIndex === targetIndex) {
      options.push(correctOption);
      continue;
    }

    options.push(distractors[distractorIndex]);
    distractorIndex += 1;
  }

  return {
    options,
    correctAnswer: targetIndex,
  };
}

function selectBackendQuestions(questionBank: LoadedQuestionBank) {
  const selection: SelectedAttemptQuestion[] = [];
  const questionsBySection = [...questionBank.questionIndex.values()].reduce((accumulator, question) => {
    if (!isQuestionBankQuestion(question)) {
      return accumulator;
    }

    const sectionQuestions = accumulator.get(question.section) ?? [];
    sectionQuestions.push(question);
    accumulator.set(question.section, sectionQuestions);
    return accumulator;
  }, new Map<string, CanonicalQuestion[]>());

  questionBank.sections.forEach((section) => {
    const selectedSectionQuestions = shuffleItems(questionsBySection.get(section) ?? []).slice(
      0,
      questionBank.questionsPerTestSection,
    );
    if (selectedSectionQuestions.length !== questionBank.questionsPerTestSection) {
      throw new AppError(500, "QUESTION_BANK_INVALID", `The ${section} mission does not have enough questions.`);
    }

    const answerSlots = buildAnswerSlotPlan(selectedSectionQuestions.length);

    selectedSectionQuestions.forEach((question, questionIndex) => {
      const randomizedQuestion = placeCorrectAnswer(question, answerSlots[questionIndex]);
      selection.push({
        questionId: selection.length + 1,
        bankId: question.bankId,
        section: question.section,
        prompt: question.prompt,
        stimulus: question.stimulus,
        options: randomizedQuestion.options,
        correctAnswer: randomizedQuestion.correctAnswer,
      });
    });
  });

  return selection;
}

function buildLegacyAttemptQuestions(
  questionBank: LoadedQuestionBank,
  questions: NonNullable<StartAttemptInput["questions"]>,
) {
  const normalizedQuestions = [...questions].sort((left, right) => left.questionId - right.questionId);
  const questionIds = new Set<number>();
  const bankIds = new Set<string>();
  const sectionCounts = new Map<string, number>();
  const questionKey: AttemptQuestionKey[] = [];
  const selectedQuestions: SelectedAttemptQuestion[] = [];
  const expectedTotalQuestions = questionBank.sections.length * questionBank.questionsPerTestSection;

  if (normalizedQuestions.length !== expectedTotalQuestions) {
    throw new AppError(400, "ATTEMPT_SHAPE_INVALID", "The attempt did not include the expected number of questions.");
  }

  normalizedQuestions.forEach((question, index) => {
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
    questionKey.push({
      questionId: question.questionId,
      bankId: question.bankId,
      correctAnswer,
      section: canonicalQuestion.section,
    });
    selectedQuestions.push({
      questionId: question.questionId,
      bankId: question.bankId,
      section: canonicalQuestion.section,
      prompt: canonicalQuestion.prompt,
      stimulus: canonicalQuestion.stimulus,
      options: [...question.options],
      correctAnswer,
    });
  });

  const hasExpectedSectionShape = questionBank.sections.every((section) => {
    return (sectionCounts.get(section) ?? 0) === questionBank.questionsPerTestSection;
  });

  if (!hasExpectedSectionShape) {
    throw new AppError(400, "ATTEMPT_SHAPE_INVALID", "The attempt did not include the expected mission distribution.");
  }

  return { questionKey, selectedQuestions };
}

function buildPreviewRecord(playerName: string, progress: ReturnType<typeof computeAttemptProgress>, elapsedSeconds: number | null) {
  if (progress.correctCount <= 0) {
    return null;
  }

  return {
    playerName,
    score: progress.correctCount,
    percentage: progress.percentage,
    totalQuestions: progress.totalQuestions,
    elapsedSeconds,
    completedAt: null,
  };
}

function buildScoreSaveAudit(args: {
  attemptId: string;
  playerName: string;
  clientType: "web" | "android";
  selectionFingerprint: string;
  oldBest: ScoreSaveComparableRow | null;
  newBest: ScoreSaveComparableRow | null;
  replacedBest: boolean;
  savedAt: string;
  score: number;
  percentage: number;
  totalQuestions: number;
  elapsedSeconds: number | null;
}) {
  return {
    attemptId: args.attemptId,
    playerName: args.playerName,
    clientType: args.clientType,
    selectionFingerprint: args.selectionFingerprint,
    oldBest: args.oldBest,
    newBest: args.newBest,
    replacedBest: args.replacedBest,
    savedAt: args.savedAt,
    score: args.score,
    percentage: args.percentage,
    totalQuestions: args.totalQuestions,
    elapsedSeconds: args.elapsedSeconds,
  };
}

function isScoreSavePayload(value: unknown): value is AttemptSavePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return "record" in candidate || "audit" in candidate;
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isScoreSaveComparableRow(value: unknown): value is ScoreSaveComparableRow {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.player_name === "string" &&
    typeof candidate.score === "number" &&
    typeof candidate.percentage === "number" &&
    typeof candidate.total_questions === "number" &&
    (candidate.elapsed_seconds === null || typeof candidate.elapsed_seconds === "number") &&
    (candidate.completed_at === null || typeof candidate.completed_at === "string")
  );
}

function doesSaveReplaceBest(oldBest: ScoreSaveComparableRow | null, newBest: ScoreSaveComparableRow) {
  return (
    !oldBest ||
    newBest.score > oldBest.score ||
    (newBest.score === oldBest.score && newBest.percentage > oldBest.percentage) ||
    (newBest.score === oldBest.score &&
      newBest.percentage === oldBest.percentage &&
      newBest.elapsed_seconds !== null &&
      (oldBest.elapsed_seconds === null || newBest.elapsed_seconds < oldBest.elapsed_seconds))
  );
}

function isExpired(expiresAt: string | null | undefined) {
  return typeof expiresAt === "string" && Date.parse(expiresAt) <= Date.now();
}

function isMissingColumnSchema(error: SupabaseErrorLike | null | undefined, columnNames: string[]) {
  const message = error?.message ?? "";
  return (
    (error?.code === "PGRST204" || error?.code === "42703") &&
    columnNames.some((column) => message.includes(column))
  );
}

function isMissingFunctionSchema(error: SupabaseErrorLike | null | undefined, functionName: string) {
  const message = error?.message ?? "";
  return (
    (error?.code === "42883" || error?.code === "PGRST202" || error?.code === "PGRST204") &&
    message.includes(functionName)
  );
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
    selectionFingerprint: string;
  }) {
    if (args.correctCount <= 0) {
      return null;
    }

    const score = args.correctCount;
    const percentage = Math.round((args.correctCount / args.totalQuestions) * 100);
    const elapsedSeconds = normalizeElapsedSeconds(args.elapsedSeconds);
    const oldBestResponse = await supabase.rpc("get_player_top_score", {
      target_player_name: normalizePlayerName(args.playerName),
    });

    if (oldBestResponse.error) {
      throw new AppError(502, "SUPABASE_READ_FAILED", "The score record could not be loaded.", oldBestResponse.error);
    }

    const oldBest = oldBestResponse.data && oldBestResponse.data.length > 0 && isScoreSaveComparableRow(oldBestResponse.data[0])
      ? oldBestResponse.data[0]
      : null;
    const savedAt = new Date().toISOString();
    const targetPlayerName = normalizePlayerName(args.playerName);

    const { data, error } = await supabase.rpc("save_attempt_score_from_attempt", {
      target_attempt_id: args.attemptId,
      target_player_name: targetPlayerName,
      score,
      percentage,
      total_questions: args.totalQuestions,
      elapsed_seconds: elapsedSeconds,
      target_selection_fingerprint: args.selectionFingerprint,
      target_saved_at: savedAt,
    });

    if (error) {
      if (isMissingFunctionSchema(error, "save_attempt_score_from_attempt")) {
        const legacySave = await supabase.rpc("save_player_score", {
          target_player_name: targetPlayerName,
          score,
          percentage,
          total_questions: args.totalQuestions,
          elapsed_seconds: elapsedSeconds,
        });

        if (legacySave.error) {
          throw new AppError(502, "SUPABASE_WRITE_FAILED", "The score record could not be saved.", legacySave.error);
        }

        const fallbackRecord = legacySave.data && isScoreSaveComparableRow(legacySave.data) ? legacySave.data : null;
        if (!fallbackRecord) {
          throw new AppError(502, "SUPABASE_WRITE_FAILED", "The score record could not be saved.", legacySave.error ?? null);
        }

        const fallbackAudit = buildScoreSaveAudit({
          attemptId: args.attemptId,
          playerName: targetPlayerName,
          clientType: args.clientType,
          selectionFingerprint: args.selectionFingerprint,
          oldBest,
          newBest: fallbackRecord,
          replacedBest: doesSaveReplaceBest(oldBest, fallbackRecord),
          savedAt,
          score,
          percentage,
          totalQuestions: args.totalQuestions,
          elapsedSeconds,
        });

        const fallbackPayload = {
          record: fallbackRecord,
          audit: fallbackAudit,
        };

        const { error: metadataError } = await supabase
          .from("score_attempts")
          .update({
            selection_fingerprint: args.selectionFingerprint,
            score_saved_at: savedAt,
            score_saved_score: score,
            score_saved_percentage: percentage,
            score_saved_elapsed_seconds: elapsedSeconds,
            score_saved_payload: fallbackPayload,
          })
          .eq("id", args.attemptId);

        if (
          metadataError &&
          !isMissingColumnSchema(metadataError, [
            "selection_fingerprint",
            "score_saved_at",
            "score_saved_score",
            "score_saved_percentage",
            "score_saved_elapsed_seconds",
            "score_saved_payload",
          ])
        ) {
          logger.warn(
            {
              error: metadataError,
              attemptId: args.attemptId,
            },
            "Score attempt metadata could not be persisted.",
          );
        }

        await this.recordAttemptEvent({
          attemptId: args.attemptId,
          eventType: "score_saved",
          playerName: args.playerName,
          clientType: args.clientType,
          metadata: fallbackAudit,
        });

        return {
          record: mapScoreRow(fallbackRecord),
          audit: fallbackAudit,
        };
      }

      throw new AppError(502, "ATTEMPT_SAVE_FAILED", "The score record could not be saved.", error);
    }

    if (!data || typeof data !== "object") {
      return null;
    }

    const payload = data as AttemptSavePayload;

    return isRecordLike(payload.record)
      ? { record: mapScoreRow(payload.record), audit: isScoreSavePayload(payload) ? payload.audit ?? null : null }
      : null;
  }

  private async getAttemptRow(attemptId: string) {
    let { data, error } = await supabase
      .from("score_attempts")
      .select(
        "id, player_name, client_type, mode, total_questions, question_key, answers, started_at, updated_at, completed_at, expires_at, selection_fingerprint, score_saved_at, score_saved_score, score_saved_percentage, score_saved_elapsed_seconds, score_saved_payload, last_elapsed_seconds",
      )
      .eq("id", attemptId)
      .single();

    if (isMissingColumnSchema(error, ["expires_at", "selection_fingerprint", "score_saved_at", "score_saved_payload"])) {
      const fallbackResponse = await supabase
        .from("score_attempts")
        .select(
          "id, player_name, client_type, mode, total_questions, question_key, answers, started_at, updated_at, completed_at, last_elapsed_seconds",
        )
        .eq("id", attemptId)
        .single();

      data = fallbackResponse.data
        ? {
            ...fallbackResponse.data,
            expires_at: null,
            selection_fingerprint: null,
            score_saved_at: null,
            score_saved_score: null,
            score_saved_percentage: null,
            score_saved_elapsed_seconds: null,
            score_saved_payload: null,
          }
        : fallbackResponse.data;
      error = fallbackResponse.error;
    }

    if (error) {
      if (error.code === "PGRST116") {
        throw new AppError(404, "ATTEMPT_NOT_FOUND", "The saved score attempt could not be found.");
      }

      throw new AppError(502, "ATTEMPT_READ_FAILED", "The score attempt could not be loaded.", error);
    }

    return data as ScoreAttemptRow;
  }

  private assertAttemptIsActive(attempt: ScoreAttemptRow) {
    const effectiveExpiry = attempt.expires_at ?? addHoursToIso(attempt.started_at, ATTEMPT_TTL_HOURS);
    if (!attempt.completed_at && isExpired(effectiveExpiry)) {
      throw new AppError(409, "ATTEMPT_EXPIRED", "This score attempt has expired.");
    }
  }

  async startAttempt(input: StartAttemptInput) {
    if (input.mode === "story") {
      return {
        storyOnly: true,
        attemptId: null,
        totalQuestions: 0,
        questions: [],
      };
    }

    const questionBank = await getLoadedQuestionBank();
    const normalizedName = normalizePlayerName(input.playerName);
    const hasClientQuestions = Array.isArray(input.questions) && input.questions.length > 0;
    const generatedSelection = hasClientQuestions ? null : selectBackendQuestions(questionBank);
    const selectionData = hasClientQuestions
      ? buildLegacyAttemptQuestions(questionBank, input.questions ?? [])
      : {
          selectedQuestions: generatedSelection ?? [],
          questionKey: (generatedSelection ?? []).map(({ correctAnswer, ...question }) => ({
            questionId: question.questionId,
            bankId: question.bankId,
            correctAnswer,
            section: question.section,
          })),
        };
    const { questionKey, selectedQuestions } = selectionData;

    const emptyAnswers = questionKey.map(() => null);
    const expiresAt = addHoursIso(ATTEMPT_TTL_HOURS);
    const selectionFingerprint = buildSelectionFingerprint(questionKey);
    let { data, error } = await supabase
      .from("score_attempts")
      .insert({
        player_name: normalizedName,
        client_type: input.clientType,
        mode: input.mode,
        total_questions: questionKey.length,
        question_key: questionKey,
        answers: emptyAnswers,
        expires_at: expiresAt,
        selection_fingerprint: selectionFingerprint,
        last_elapsed_seconds: null,
      })
      .select("id, total_questions, expires_at, selection_fingerprint")
      .single();

    if (isMissingColumnSchema(error, ["expires_at", "selection_fingerprint"])) {
      const fallbackResponse = await supabase
        .from("score_attempts")
        .insert({
          player_name: normalizedName,
          client_type: input.clientType,
          mode: input.mode,
          total_questions: questionKey.length,
          question_key: questionKey,
          answers: emptyAnswers,
          last_elapsed_seconds: null,
        })
        .select("id, total_questions")
        .single();

      data = fallbackResponse.data
        ? {
            ...fallbackResponse.data,
            expires_at: null,
            selection_fingerprint: selectionFingerprint,
          }
        : fallbackResponse.data;
      error = fallbackResponse.error;
    }

    if (error) {
      throw new AppError(502, "ATTEMPT_CREATE_FAILED", "The score attempt could not be created.", error);
    }

    if (!data) {
      throw new AppError(502, "ATTEMPT_CREATE_FAILED", "The score attempt could not be created.");
    }

    await this.recordAttemptEvent({
      attemptId: data.id,
      eventType: "attempt_started",
      playerName: normalizedName,
      clientType: input.clientType,
      metadata: {
        mode: input.mode,
        totalQuestions: data.total_questions,
        expiresAt: data.expires_at ?? expiresAt,
        selectionFingerprint,
      },
    });

    return {
      storyOnly: false,
      attemptId: data.id,
      totalQuestions: data.total_questions,
      questions: buildAttemptQuestions(selectedQuestions),
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
    const record = buildPreviewRecord(
      attempt.player_name,
      progress,
      normalizeElapsedSeconds(input.elapsedSeconds),
    );
    const correctAnswer = questionKey[slotIndex].correctAnswer;

    return {
      accepted: true,
      correctAnswer,
      isCorrect: input.selectedAnswer === correctAnswer,
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
    if (attempt.score_saved_payload && typeof attempt.score_saved_payload === "object") {
      const savedPayload = attempt.score_saved_payload as {
        record?: Record<string, unknown> | null;
        audit?: Record<string, unknown> | null;
      };

      return {
        finalized: true,
        progress,
        record: savedPayload.record ? mapScoreRow(savedPayload.record) : null,
      };
    }

    const saved = await this.saveAuthoritativeScore({
      attemptId,
      playerName: attempt.player_name,
      clientType: attempt.client_type,
      correctCount: progress.correctCount,
      totalQuestions: progress.totalQuestions,
      elapsedSeconds: normalizeElapsedSeconds(input.elapsedSeconds ?? attempt.last_elapsed_seconds),
      selectionFingerprint: attempt.selection_fingerprint ?? buildSelectionFingerprint(questionKey),
    });

    return {
      finalized: true,
      progress,
      record: saved?.record ?? null,
    };
  }
}
