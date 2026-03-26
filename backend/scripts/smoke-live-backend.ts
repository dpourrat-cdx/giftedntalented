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

function expectObject(step: string, body: unknown): Record<string, unknown> {
  assert(body && typeof body === "object" && !Array.isArray(body), `${step} failed: response body was not an object`);
  return body as Record<string, unknown>;
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

  console.log("Live backend smoke checks passed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
