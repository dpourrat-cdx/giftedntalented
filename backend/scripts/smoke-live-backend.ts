import { getLoadedQuestionBank } from "../src/lib/question-bank.js";

type JsonResponse = {
  status: number;
  body: unknown;
};

const baseUrl = new URL((process.env.BACKEND_BASE_URL || "https://giftedntalented.onrender.com/api/v1").replace(/\/?$/, "/"));
const playerName = `Smoke ${Date.now().toString(36)}`;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function buildUrl(path: string) {
  return new URL(path.replace(/^\//, ""), baseUrl);
}

async function readJsonResponse(response: Response): Promise<JsonResponse> {
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    body,
  };
}

async function requestJson(path: string, init: RequestInit = {}) {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

  return readJsonResponse(response);
}

function expectStatus(step: string, response: JsonResponse, expectedStatus: number) {
  assert(
    response.status === expectedStatus,
    `${step} failed: expected HTTP ${expectedStatus}, received ${response.status}. Body: ${JSON.stringify(response.body)}`,
  );
}

function expectReplaySafeStatus(step: string, response: JsonResponse, expectedStatuses: number[]) {
  assert(
    expectedStatuses.includes(response.status),
    `${step} failed: expected HTTP ${expectedStatuses.join(" or ")}, received ${response.status}. Body: ${JSON.stringify(response.body)}`,
  );
}

function expectObject(step: string, body: unknown): Record<string, unknown> {
  assert(body && typeof body === "object" && !Array.isArray(body), `${step} failed: response body was not an object`);
  return body as Record<string, unknown>;
}

function expectRecordSnapshot(step: string, body: Record<string, unknown> | null) {
  assert(body && typeof body === "object", `${step} failed: record payload was missing`);
  return {
    playerName: String(body.playerName || ""),
    score: Number(body.score),
    percentage: Number(body.percentage),
    totalQuestions: Number(body.totalQuestions),
    elapsedSeconds: body.elapsedSeconds === null || body.elapsedSeconds === undefined ? null : Number(body.elapsedSeconds),
    completedAt: String(body.completedAt || ""),
  };
}

function buildWebQuestions(questionBank: Awaited<ReturnType<typeof getLoadedQuestionBank>>) {
  const questions: Array<{
    questionId: number;
    bankId: string;
    options: string[];
    answer: number;
    section: string;
  }> = [];

  let questionId = 1;

  for (const section of questionBank.sections) {
    const sectionQuestions = [...questionBank.questionIndex.values()]
      .filter((question) => question.section === section)
      .sort((left, right) => left.bankId.localeCompare(right.bankId))
      .slice(0, questionBank.questionsPerTestSection);

    sectionQuestions.forEach((question) => {
      questions.push({
        questionId,
        bankId: question.bankId,
        options: [...question.options],
        answer: question.answer,
        section: question.section,
      });
      questionId += 1;
    });
  }

  return questions;
}

async function main() {
  console.log(`Running live backend smoke checks against ${baseUrl.origin}${baseUrl.pathname}`);
  console.log(`Using player name ${playerName}`);

  const health = await requestJson("/health");
  expectStatus("health", health, 200);
  const healthBody = expectObject("health", health.body);
  assert(healthBody.status === "ok", `health failed: expected status ok, received ${String(healthBody.status)}`);
  assert(
    healthBody.services && typeof healthBody.services === "object" && (healthBody.services as Record<string, unknown>).supabase === "ok",
    "health failed: Supabase service was not reported as ok",
  );
  console.log("Health check passed.");

  const legacy = await requestJson(`/players/${encodeURIComponent(playerName)}/record`, {
    method: "POST",
    body: JSON.stringify({
      score: 1,
      percentage: 1,
      totalQuestions: 1,
      clientType: "web",
    }),
  });
  expectStatus("legacy score endpoint", legacy, 410);
  const legacyBody = expectObject("legacy score endpoint", legacy.body);
  assert(
    legacyBody.error === "LEGACY_SCORE_ENDPOINT_DISABLED",
    "legacy score endpoint failed: expected the endpoint to be disabled",
  );
  console.log("Legacy endpoint check passed.");

  const questionBank = await getLoadedQuestionBank();
  const webQuestions = buildWebQuestions(questionBank);
  assert(webQuestions.length > 0, "question bank failed: no web questions were available");

  const start = await requestJson("/attempts", {
    method: "POST",
    body: JSON.stringify({
      playerName,
      clientType: "web",
      mode: "quiz",
      questions: webQuestions.map(({ answer, section, ...question }) => question),
    }),
  });
  expectStatus("attempt start", start, 201);
  const startBody = expectObject("attempt start", start.body);
  const attemptId = String(startBody.attemptId || "");
  assert(attemptId, "attempt start failed: attemptId was missing");
  assert(startBody.storyOnly === false, "attempt start failed: expected storyOnly to be false");
  assert(startBody.totalQuestions === webQuestions.length, "attempt start failed: total question count was wrong");

  const firstQuestion = webQuestions[0];
  const wrongAnswer = (firstQuestion.answer + 1) % firstQuestion.options.length;

  const answer = await requestJson(`/attempts/${encodeURIComponent(attemptId)}/answers`, {
    method: "POST",
    body: JSON.stringify({
      questionId: firstQuestion.questionId,
      bankId: firstQuestion.bankId,
      selectedAnswer: wrongAnswer,
      elapsedSeconds: 12,
    }),
  });
  expectStatus("answer submission", answer, 201);
  const answerBody = expectObject("answer submission", answer.body);
  assert(answerBody.accepted === true, "answer submission failed: answer was not accepted");
  const progress = expectObject("answer submission progress", answerBody.progress);
  assert(progress.answeredCount === 1, "answer submission failed: answered count was not 1");
  assert(progress.correctCount === 0, "answer submission failed: wrong answer should not have been counted correct");

  const finalize = await requestJson(`/attempts/${encodeURIComponent(attemptId)}/finalize`, {
    method: "POST",
    body: JSON.stringify({
      elapsedSeconds: 15,
    }),
  });
  expectStatus("attempt finalize", finalize, 200);
  const finalizeBody = expectObject("attempt finalize", finalize.body);
  assert(finalizeBody.finalized === true, "attempt finalize failed: finalized was not true");
  assert(finalizeBody.record === null, "attempt finalize failed: wrong-answer run should not save a score record");
  console.log("Attempt flow checks passed up through finalize.");

  const recordLookup = await requestJson(`/players/${encodeURIComponent(playerName)}/record`);
  expectStatus("post-finalize record lookup", recordLookup, 404);
  console.log("Record lookup check passed.");

  const replayPlayerName = `${playerName} replay`;
  const replayStart = await requestJson("/attempts", {
    method: "POST",
    body: JSON.stringify({
      playerName: replayPlayerName,
      clientType: "web",
      mode: "quiz",
      questions: webQuestions.map(({ answer, section, ...question }) => question),
    }),
  });
  expectStatus("replay attempt start", replayStart, 201);
  const replayStartBody = expectObject("replay attempt start", replayStart.body);
  const replayAttemptId = String(replayStartBody.attemptId || "");
  assert(replayAttemptId, "replay attempt start failed: attemptId was missing");

  const correctAnswer = webQuestions[0];
  const correctSubmitBody = {
    questionId: correctAnswer.questionId,
    bankId: correctAnswer.bankId,
    selectedAnswer: correctAnswer.answer,
    elapsedSeconds: 18,
  };

  const firstReplayAnswer = await requestJson(`/attempts/${encodeURIComponent(replayAttemptId)}/answers`, {
    method: "POST",
    body: JSON.stringify(correctSubmitBody),
  });
  expectStatus("replay answer submission", firstReplayAnswer, 201);
  const firstReplayAnswerBody = expectObject("replay answer submission", firstReplayAnswer.body);
  assert(firstReplayAnswerBody.accepted === true, "replay answer submission failed: answer was not accepted");
  const firstReplayProgress = expectObject("replay answer submission progress", firstReplayAnswerBody.progress);
  assert(firstReplayProgress.answeredCount === 1, "replay answer submission failed: answered count was not 1");
  assert(firstReplayProgress.correctCount === 1, "replay answer submission failed: correct answer should have been counted correct");
  const firstReplayRecord = expectRecordSnapshot("replay answer submission record", firstReplayAnswerBody.record as Record<string, unknown> | null);

  const secondReplayAnswer = await requestJson(`/attempts/${encodeURIComponent(replayAttemptId)}/answers`, {
    method: "POST",
    body: JSON.stringify(correctSubmitBody),
  });
  expectReplaySafeStatus("replayed answer submission", secondReplayAnswer, [201, 409]);
  if (secondReplayAnswer.status === 201) {
    const secondReplayAnswerBody = expectObject("replayed answer submission", secondReplayAnswer.body);
    assert(secondReplayAnswerBody.accepted === true, "replayed answer submission failed: answer was not accepted");
    const secondReplayProgress = expectObject("replayed answer submission progress", secondReplayAnswerBody.progress);
    assert(
      secondReplayProgress.answeredCount === firstReplayProgress.answeredCount &&
        secondReplayProgress.correctCount === firstReplayProgress.correctCount &&
        secondReplayProgress.totalQuestions === firstReplayProgress.totalQuestions,
      "replayed answer submission failed: progress changed on retry",
    );
    const secondReplayRecord = expectRecordSnapshot(
      "replayed answer submission record",
      secondReplayAnswerBody.record as Record<string, unknown> | null,
    );
    assert(
      JSON.stringify(secondReplayRecord) === JSON.stringify(firstReplayRecord),
      "replayed answer submission failed: returned score record changed on retry",
    );
  } else {
    const secondReplayBody = expectObject("replayed answer submission", secondReplayAnswer.body);
    assert(
      secondReplayBody.error === "ATTEMPT_ANSWER_LOCKED" || secondReplayBody.error === "ATTEMPT_ALREADY_COMPLETED",
      "replayed answer submission failed: unexpected replay error",
    );
  }

  const firstReplayFinalize = await requestJson(`/attempts/${encodeURIComponent(replayAttemptId)}/finalize`, {
    method: "POST",
    body: JSON.stringify({
      elapsedSeconds: 22,
    }),
  });
  expectStatus("replay attempt finalize", firstReplayFinalize, 200);
  const firstReplayFinalizeBody = expectObject("replay attempt finalize", firstReplayFinalize.body);
  assert(firstReplayFinalizeBody.finalized === true, "replay attempt finalize failed: finalized was not true");
  const firstReplayFinalizeRecord = expectRecordSnapshot(
    "replay attempt finalize record",
    firstReplayFinalizeBody.record as Record<string, unknown> | null,
  );

  const secondReplayFinalize = await requestJson(`/attempts/${encodeURIComponent(replayAttemptId)}/finalize`, {
    method: "POST",
    body: JSON.stringify({
      elapsedSeconds: 22,
    }),
  });
  expectReplaySafeStatus("replayed attempt finalize", secondReplayFinalize, [200, 409]);
  if (secondReplayFinalize.status === 200) {
    const secondReplayFinalizeBody = expectObject("replayed attempt finalize", secondReplayFinalize.body);
    assert(secondReplayFinalizeBody.finalized === true, "replayed attempt finalize failed: finalized was not true");
    const secondReplayFinalizeRecord = expectRecordSnapshot(
      "replayed attempt finalize record",
      secondReplayFinalizeBody.record as Record<string, unknown> | null,
    );
    assert(
      JSON.stringify(secondReplayFinalizeRecord) === JSON.stringify(firstReplayFinalizeRecord),
      "replayed attempt finalize failed: returned score record changed on retry",
    );
  } else {
    const secondReplayBody = expectObject("replayed attempt finalize", secondReplayFinalize.body);
    assert(
      secondReplayBody.error === "ATTEMPT_ALREADY_COMPLETED",
      "replayed attempt finalize failed: unexpected replay error",
    );
  }

  const replayRecordLookup = await requestJson(`/players/${encodeURIComponent(replayPlayerName)}/record`);
  expectStatus("replay post-finalize record lookup", replayRecordLookup, 200);
  const replayRecordLookupBody = expectObject("replay post-finalize record lookup", replayRecordLookup.body);
  assert(replayRecordLookupBody.playerName === replayPlayerName, "replay post-finalize record lookup failed: wrong player returned");
  console.log("Replay-safe answer/finalize checks passed.");

  console.log("Live backend smoke checks passed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
