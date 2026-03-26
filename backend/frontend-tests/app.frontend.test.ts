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

function buildGamificationStub() {
  return {
    sync() {},
    onAnswerEvaluated() {},
    onTestCompleted() {},
    hasBlockingOverlay() {
      return true;
    },
    showMissionUpdate() {},
    showMissionCompletion() {},
    reset() {},
    clearTransientFeedback() {},
  };
}

function buildQuestionBankStub(question = attemptQuestion) {
  return {
    SECTIONS: ["Verbal"],
    QUESTIONS_PER_TEST_SECTION: 1,
    buildTestSession() {
      return [{ ...question, options: [...question.options] }];
    },
    getQuestionPool() {
      return {
        Verbal: [{ ...question, options: [...question.options] }],
      };
    },
  };
}

async function startAttemptWithScoreboard(question: typeof attemptQuestion, answerResult: Record<string, unknown>) {
  await loadIndexHtml();
  await importBrowserScript("content.js");

  window.GiftedQuestionBank = buildQuestionBankStub(question);
  window.GiftedGamification = {
    createGamificationController() {
      return buildGamificationStub();
    },
  };

  const beginAttempt = vi.fn().mockResolvedValue({
    questions: [{ ...question, options: [...question.options] }],
  });
  const recordValidatedAnswer = vi.fn().mockResolvedValue(answerResult);
  const finalizeAttempt = vi.fn().mockResolvedValue(null);

  window.GiftedScoreboard = {
    createScoreboardController() {
      return {
        init() {},
        setActivePlayerName() {},
        resetActiveAttempt() {},
        beginAttempt,
        recordValidatedAnswer,
        finalizeAttempt,
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

  return {
    beginAttempt,
    recordValidatedAnswer,
    finalizeAttempt,
  };
}

async function completeSingleQuestionFlow(selectedOptionIndex: number) {
  const optionButtons = Array.from(
    document.querySelectorAll("#optionsList button"),
  ) as HTMLButtonElement[];
  optionButtons[selectedOptionIndex].click();

  const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
  nextButton.click();

  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));

  nextButton.click();

  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

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
    Object.defineProperty(window, "scrollTo", {
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

  it("renders the perfect-score review card through DOM nodes", async () => {
    await startAttemptWithScoreboard(attemptQuestion, {
      accepted: true,
      correctAnswer: attemptQuestion.answer,
      isCorrect: true,
      progress: {
        answeredCount: 1,
        correctCount: 1,
        totalQuestions: 1,
        percentage: 100,
      },
      record: {
        playerName: "Alex",
        score: 1,
        totalQuestions: 1,
        percentage: 100,
        elapsedSeconds: 10,
      },
    });

    await completeSingleQuestionFlow(attemptQuestion.answer);

    const reviewCard = document.querySelector("#reviewList .review-card") as HTMLElement;
    expect(reviewCard).toBeTruthy();
    expect(reviewCard.querySelector("h4")?.textContent).toBe("Legendary Launch");
    expect(reviewCard.querySelector("p")?.textContent).toContain("Captain Nova's rocket launched");
    expect(reviewCard.querySelector("img")).toBeNull();
  });

  it("keeps missed-question review content as text instead of injected HTML", async () => {
    const riskyQuestion = {
      id: 1,
      bankId: "Verbal-risky-1",
      section: "Verbal",
      prompt: "<img src=x onerror='window.__promptInjected=true'> Prompt?",
      options: [
        "<strong>Wrong</strong>",
        "Beta",
        "<em>Correct</em>",
        "Delta",
      ],
      answer: 2,
      explanation: "<b>Because</b> this should stay text.",
      stimulus: "<svg><script>window.__stimulusInjected=true</script></svg>",
    };

    await startAttemptWithScoreboard(riskyQuestion, {
      accepted: true,
      correctAnswer: riskyQuestion.answer,
      isCorrect: false,
      progress: {
        answeredCount: 1,
        correctCount: 0,
        totalQuestions: 1,
        percentage: 0,
      },
      record: null,
    });

    await completeSingleQuestionFlow(0);

    const reviewCard = document.querySelector("#reviewList .review-card") as HTMLElement;
    expect(reviewCard.querySelector("h4")?.textContent).toContain("Mission 1: Verbal Challenge - Step 1");
    expect(reviewCard.querySelector("p")?.textContent).toBe(riskyQuestion.prompt);
    expect(reviewCard.querySelector(".question-stimulus")?.textContent).toBe(riskyQuestion.stimulus);
    expect(reviewCard.textContent).toContain(riskyQuestion.explanation);
    expect(reviewCard.textContent).toContain(riskyQuestion.options[0]);
    expect(reviewCard.textContent).toContain(riskyQuestion.options[riskyQuestion.answer]);
    expect(reviewCard.querySelector("img")).toBeNull();
    expect(reviewCard.querySelector("script")).toBeNull();
    expect(reviewCard.querySelector("svg")).toBeNull();
    expect(reviewCard.querySelector("b")).toBeNull();
    expect((window as Window & typeof globalThis & Record<string, unknown>).__promptInjected).toBeUndefined();
    expect((window as Window & typeof globalThis & Record<string, unknown>).__stimulusInjected).toBeUndefined();
  });
});
