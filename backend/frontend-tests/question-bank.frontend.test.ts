// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadFrontendScript, resetFrontendGlobals } from "./helpers/frontend-script";

describe("GiftedQuestionBank", () => {
  beforeEach(() => {
    resetFrontendGlobals();
    vi.restoreAllMocks();
  });

  it("builds a full test session and persists recent bank history", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25);

    await loadFrontendScript("question-bank.js");

    const bank = window.GiftedQuestionBank;
    expect(bank).toBeDefined();

    const session = bank.buildTestSession();
    expect(session).toHaveLength(bank.SECTIONS.length * bank.QUESTIONS_PER_TEST_SECTION);

    const perSectionCounts = new Map<string, number>();
    for (const question of session) {
      perSectionCounts.set(question.section, (perSectionCounts.get(question.section) || 0) + 1);
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(4);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(4);
      expect(question.bankId).toMatch(/^[A-Za-z]+-\d+$/);
    }

    bank.SECTIONS.forEach((section) => {
      expect(perSectionCounts.get(section)).toBe(bank.QUESTIONS_PER_TEST_SECTION);
    });

    const storedHistory = JSON.parse(
      window.localStorage.getItem("gifted-question-history-v1") || "{}",
    ) as Record<string, string[]>;

    bank.SECTIONS.forEach((section) => {
      expect(storedHistory[section]).toHaveLength(bank.QUESTIONS_PER_TEST_SECTION);
    });
  });

  it("returns defensive clones of the question pool", async () => {
    await loadFrontendScript("question-bank.js");

    const firstPool = window.GiftedQuestionBank.getQuestionPool();
    const originalPrompt = firstPool.Verbal[0].prompt;
    firstPool.Verbal[0].prompt = "mutated";
    firstPool.Verbal[0].options[0] = "changed";

    const secondPool = window.GiftedQuestionBank.getQuestionPool();
    expect(secondPool.Verbal[0].prompt).toBe(originalPrompt);
    expect(secondPool.Verbal[0].options[0]).not.toBe("changed");
  });

  it("builds the logic challenge activity-order prompts with the expected reasoning text", async () => {
    await loadFrontendScript("question-bank.js");

    const logicalSection = window.GiftedQuestionBank.SECTIONS[7];
    const logicalQuestions = window.GiftedQuestionBank.getQuestionPool()[logicalSection];
    const challengeQuestions = logicalQuestions.slice(100);
    const activityChallenge = challengeQuestions.find((question) =>
      question.prompt.includes("What happened first?"),
    );

    expect(activityChallenge).toBeDefined();
    expect(activityChallenge?.prompt).toContain("science happened after reading.");
    expect(activityChallenge?.prompt).toContain("music happened after science.");
    expect(activityChallenge?.prompt).toContain("art happened after music.");
    expect(activityChallenge?.options[activityChallenge.answer]).toBe("reading");
    expect(activityChallenge?.explanation).toBe("The order is reading, then science, then music, then art.");
  });

  it("builds the logic challenge speed-order prompts with stable ranking answers", async () => {
    await loadFrontendScript("question-bank.js");

    const logicalSection = window.GiftedQuestionBank.SECTIONS[7];
    const logicalQuestions = window.GiftedQuestionBank.getQuestionPool()[logicalSection];
    const challengeQuestions = logicalQuestions.slice(100);
    const speedChallenge = challengeQuestions.find((question) =>
      question.prompt.includes("Who is fastest?"),
    );

    expect(speedChallenge).toBeDefined();
    expect(speedChallenge?.prompt).toContain("Mia is faster than Ben.");
    expect(speedChallenge?.prompt).toContain("Ben is faster than Ava.");
    expect(speedChallenge?.prompt).toContain("Ava is faster than Leo.");
    expect(speedChallenge?.options[speedChallenge.answer]).toBe("Mia");
    expect(speedChallenge?.explanation).toBe("The speed order is Mia, Ben, Ava, Leo.");
  });

  it("builds the logic challenge attribute-chain prompts with the derived must-be-true answer", async () => {
    await loadFrontendScript("question-bank.js");

    const logicalSection = window.GiftedQuestionBank.SECTIONS[7];
    const logicalQuestions = window.GiftedQuestionBank.getQuestionPool()[logicalSection];
    const challengeQuestions = logicalQuestions.slice(100);
    const attributeChallenge = challengeQuestions.find((question) =>
      question.prompt.includes("What must be true?") && question.prompt.includes("All zibs are striped."),
    );

    expect(attributeChallenge).toBeDefined();
    expect(attributeChallenge?.prompt).toContain("All striped things are bumpy.");
    expect(attributeChallenge?.prompt).toContain("All bumpy things are round.");
    expect(attributeChallenge?.prompt).toContain("Nora has a zib.");
    expect(attributeChallenge?.options[attributeChallenge.answer]).toBe("Nora has something round.");
    expect(attributeChallenge?.explanation).toContain("Nora's zib must be round.");
  });

  it("builds the logical event-order prompts with the expected answer and explanation", async () => {
    await loadFrontendScript("question-bank.js");

    const logicalSection = window.GiftedQuestionBank.SECTIONS[7];
    const logicalQuestions = window.GiftedQuestionBank.getQuestionPool()[logicalSection];
    const eventQuestion = logicalQuestions[0];

    expect(eventQuestion.prompt).toBe(
      "breakfast happened before reading. reading happened before math. What happened first?",
    );
    expect(eventQuestion.options[eventQuestion.answer]).toBe("breakfast");
    expect(eventQuestion.explanation).toBe("The order is breakfast, then reading, then math.");
  });

  it("builds the logical height-order prompts with the expected tallest answer", async () => {
    await loadFrontendScript("question-bank.js");

    const logicalSection = window.GiftedQuestionBank.SECTIONS[7];
    const logicalQuestions = window.GiftedQuestionBank.getQuestionPool()[logicalSection];
    const heightQuestion = logicalQuestions[25];

    expect(heightQuestion.prompt).toBe(
      "Mia is taller than Ben. Ben is taller than Ava. Who is tallest?",
    );
    expect(heightQuestion.options[heightQuestion.answer]).toBe("Mia");
    expect(heightQuestion.explanation).toBe(
      "If Mia is taller than Ben and Ben is taller than Ava, the order is clear.",
    );
  });

  it("builds the logical attribute-truth prompts with the derived must-be-true answer", async () => {
    await loadFrontendScript("question-bank.js");

    const logicalSection = window.GiftedQuestionBank.SECTIONS[7];
    const logicalQuestions = window.GiftedQuestionBank.getQuestionPool()[logicalSection];
    const attributeQuestion = logicalQuestions[50];

    expect(attributeQuestion.prompt).toBe(
      "All zibs are blue. All blue things are round. Leo has a zib. What must be true?",
    );
    expect(attributeQuestion.options[attributeQuestion.answer]).toBe("Leo has something round.");
    expect(attributeQuestion.explanation).toContain("Leo's zib must be round.");
  });

  it("builds the logical line-order prompts with the expected middle answer", async () => {
    await loadFrontendScript("question-bank.js");

    const logicalSection = window.GiftedQuestionBank.SECTIONS[7];
    const logicalQuestions = window.GiftedQuestionBank.getQuestionPool()[logicalSection];
    const lineQuestion = logicalQuestions[76];

    expect(lineQuestion.prompt).toBe(
      "Ava is after Ben. Leo is after Ava. Who is middle in line?",
    );
    expect(lineQuestion.options[lineQuestion.answer]).toBe("Ava");
    expect(lineQuestion.explanation).toBe("The line order is Ben, then Ava, then Leo.");
  });
});
