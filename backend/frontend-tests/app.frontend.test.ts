// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { importBrowserScript, loadIndexHtml, resetBrowserGlobals } from "./helpers/browser-script";

const attemptQuestion = {
  id: 1,
  bankId: "Verbal-1",
  section: "Verbal",
  prompt: "Which answer is right?",
  options: ["Alpha", "Beta", "Gamma", "Delta"],
  answer: 2,
  explanation: "Because Gamma fits best.",
  stimulus: "",
};

describe("app.js targeted coverage", () => {
  beforeEach(() => {
    vi.resetModules();
    resetBrowserGlobals();
    vi.restoreAllMocks();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
    Object.defineProperty(window.Element.prototype, "scrollIntoView", {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  it("wraps answer buttons in list items when rendering a started attempt", async () => {
    await loadIndexHtml();
    await importBrowserScript("content.js");

    window.GiftedQuestionBank = {
      SECTIONS: ["Verbal"],
      QUESTIONS_PER_TEST_SECTION: 1,
      buildTestSession() {
        return [{ ...attemptQuestion, options: [...attemptQuestion.options] }];
      },
      getQuestionPool() {
        return {
          Verbal: [{ ...attemptQuestion, options: [...attemptQuestion.options] }],
        };
      },
    };

    window.GiftedGamification = {
      createGamificationController() {
        return {
          sync() {},
          onAnswerEvaluated() {},
          onTestCompleted() {},
          hasBlockingOverlay() {
            return false;
          },
          showMissionUpdate() {},
          showMissionCompletion() {},
          reset() {},
          clearTransientFeedback() {},
        };
      },
    };

    window.GiftedScoreboard = {
      createScoreboardController() {
        return {
          init() {},
          setActivePlayerName() {},
          resetActiveAttempt() {},
          beginAttempt: vi.fn().mockResolvedValue({
            questions: [{ ...attemptQuestion, options: [...attemptQuestion.options] }],
          }),
          recordValidatedAnswer: vi.fn().mockResolvedValue(null),
          finalizeAttempt: vi.fn().mockResolvedValue(null),
        };
      },
    };

    await importBrowserScript("app.js");

    const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
    nameInput.value = "Alex";
    nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
    nameInput.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );

    await Promise.resolve();
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    const optionsList = document.getElementById("optionsList") as HTMLUListElement;
    expect(optionsList.children).toHaveLength(4);
    Array.from(optionsList.children).forEach((child) => {
      expect(child.tagName).toBe("LI");
      expect(child.firstElementChild?.tagName).toBe("BUTTON");
    });
  });
});
