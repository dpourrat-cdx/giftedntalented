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
});
