// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { importBrowserScript, loadIndexHtml, resetBrowserGlobals } from "./helpers/browser-script";
import { loadFrontendScript } from "./helpers/frontend-script";

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

function buildGamificationStub(hasBlockingOverlay = true) {
  return {
    sync: vi.fn(),
    onAnswerEvaluated: vi.fn(),
    onTestCompleted: vi.fn(),
    hasBlockingOverlay() {
      return hasBlockingOverlay;
    },
    showMissionUpdate: vi.fn(),
    showMissionCompletion: vi.fn(),
    requestMissionIntroduction: vi.fn(),
    reset: vi.fn(),
    clearTransientFeedback: vi.fn(),
  };
}

function buildQuestionBankStub(question = attemptQuestion) {
  const questions = Array.isArray(question) ? question : [question];
  const sections = [...new Set(questions.map((entry) => entry.section))];
  const groupedQuestions = questions.reduce((pool, entry) => {
    const sectionQuestions = pool[entry.section] ?? [];
    sectionQuestions.push({ ...entry, options: [...entry.options] });
    pool[entry.section] = sectionQuestions;
    return pool;
  }, {} as Record<string, typeof attemptQuestion[]>);

  return {
    SECTIONS: sections,
    QUESTIONS_PER_TEST_SECTION: questions.length,
    buildTestSession() {
      return questions.map((entry) => ({ ...entry, options: [...entry.options] }));
    },
    getQuestionPool() {
      return groupedQuestions;
    },
  };
}

async function setupAppWithQuestions(
  questions: typeof attemptQuestion[],
  options: { storyOnly?: boolean; scoreboard?: boolean; blockingOverlay?: boolean } = {},
) {
  await loadIndexHtml();
  await importBrowserScript("content.js");

  const [primaryQuestion = attemptQuestion] = questions;
  window.GiftedQuestionBank = buildQuestionBankStub(questions);
  let gamificationController = buildGamificationStub();
  let overlayStateChange: ((overlayState: Record<string, unknown> | null) => void) | null = null;
  window.GiftedGamification = {
    createGamificationController(config: { callbacks?: { onOverlayStateChange?: typeof overlayStateChange } } = {}) {
      overlayStateChange = config.callbacks?.onOverlayStateChange ?? null;
      gamificationController = buildGamificationStub(options.blockingOverlay !== false);
      return gamificationController;
    },
  };

  const beginAttempt = vi.fn().mockResolvedValue({
    questions: questions.map((entry) => ({ ...entry, options: [...entry.options] })),
  });
  const recordValidatedAnswer = vi.fn().mockResolvedValue({
    accepted: true,
    correctAnswer: primaryQuestion.answer,
    isCorrect: false,
    progress: {
      answeredCount: 1,
      correctCount: 0,
      totalQuestions: questions.length,
      percentage: 0,
    },
    record: null,
  });
  const finalizeAttempt = vi.fn().mockResolvedValue(null);

  if (options.scoreboard !== false) {
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
  }

  await importBrowserScript("app.js");

  if (options.storyOnly) {
    const toggle = document.getElementById("storyOnlyToggle") as HTMLInputElement;
    if (toggle) {
      toggle.checked = true;
      toggle.dispatchEvent(new window.Event("change", { bubbles: true }));
    }
  }

  return { beginAttempt, recordValidatedAnswer, finalizeAttempt, gamificationController, overlayStateChange };
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

async function setupApp(
  question = attemptQuestion,
  options: { storyOnly?: boolean; scoreboard?: boolean; blockingOverlay?: boolean } = {},
) {
  return setupAppWithQuestions([question], options);
}

async function startApp(question = attemptQuestion, options: { storyOnly?: boolean } = {}) {
  const mocks = await setupApp(question, options);

  const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
  nameInput.value = "Alex";
  nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
  nameInput.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
  );

  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));

  return mocks;
}

async function loadNormalizeAttemptQuestion(question = attemptQuestion) {
  await loadIndexHtml();
  await loadFrontendScript("content.js");

  window.GiftedQuestionBank = buildQuestionBankStub(question);
  window.GiftedGamification = {
    createGamificationController() {
      return buildGamificationStub();
    },
  };
  window.GiftedScoreboard = {
    createScoreboardController() {
      return {
        init() {},
        setActivePlayerName() {},
        resetActiveAttempt() {},
        beginAttempt: vi.fn().mockResolvedValue({ questions: [{ ...question, options: [...question.options] }] }),
        recordValidatedAnswer: vi.fn().mockResolvedValue(null),
        finalizeAttempt: vi.fn().mockResolvedValue(null),
      };
    },
  };

  await loadFrontendScript("app.js");

  return window.eval("normalizeAttemptQuestion") as (
    question: unknown,
    index: number,
  ) => Record<string, unknown> | null;
}

async function loadAppHelpers(question = attemptQuestion) {
  await loadIndexHtml();
  await loadFrontendScript("content.js");

  window.GiftedQuestionBank = buildQuestionBankStub(question);
  window.GiftedGamification = {
    createGamificationController() {
      return buildGamificationStub();
    },
  };
  window.GiftedScoreboard = {
    createScoreboardController() {
      return {
        init() {},
        setActivePlayerName() {},
        resetActiveAttempt() {},
        beginAttempt: vi.fn().mockResolvedValue({ questions: [{ ...question, options: [...question.options] }] }),
        recordValidatedAnswer: vi.fn().mockResolvedValue(null),
        finalizeAttempt: vi.fn().mockResolvedValue(null),
      };
    },
  };

  await loadFrontendScript("app.js");

  return {
    renderRocketSceneMarkup: window.eval("renderRocketSceneMarkup") as (
      stageCount: number,
      boostCount: number,
    ) => string,
    resolveNextHintText: window.eval("resolveNextHintText") as (
      state: Record<string, unknown>,
      allAnswered: boolean,
    ) => string,
    resolveNextButtonText: window.eval("resolveNextButtonText") as (
      state: Record<string, unknown>,
      allAnswered: boolean,
    ) => string,
    shouldDisableNextButton: window.eval("shouldDisableNextButton") as (
      state: Record<string, unknown>,
    ) => boolean,
    getStoryOnlyOverlayDismissalAction: window.eval("getStoryOnlyOverlayDismissalAction") as (
      dismissedEvent: Record<string, unknown> | null,
    ) => string | null,
    getSectionOverlayDismissalAction: window.eval("getSectionOverlayDismissalAction") as (
      dismissedEvent: Record<string, unknown> | null,
    ) => string | null,
    handleStoryOnlyOverlayDismissal: window.eval("handleStoryOnlyOverlayDismissal") as (
      dismissedEvent: Record<string, unknown> | null,
    ) => boolean,
    handleStandardOverlayDismissal: window.eval("handleStandardOverlayDismissal") as (
      dismissedEvent: Record<string, unknown> | null,
    ) => boolean,
    shouldResumeDeferredAutoAdvance: window.eval("shouldResumeDeferredAutoAdvance") as (
      hasBlockingOverlay: boolean,
    ) => boolean,
    resolveAuthoritativeCorrectAnswer: window.eval("resolveAuthoritativeCorrectAnswer") as (
      result: Record<string, unknown> | null,
      fallbackAnswer: number,
    ) => number,
    resolveAnswerEvaluationIsCorrect: window.eval("resolveAnswerEvaluationIsCorrect") as (
      result: Record<string, unknown> | null,
      selectedAnswer: number,
      authoritativeCorrectAnswer: number,
    ) => boolean,
  };
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

  describe("renderStartScreen", () => {
    it("shows the start screen with name entry visible and next button disabled", async () => {
      await setupApp();

      const questionPanel = document.getElementById("questionPanel") as HTMLElement;
      const nameEntry = document.getElementById("nameEntry") as HTMLElement;
      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      const nextHint = document.getElementById("nextHint") as HTMLElement;

      expect(questionPanel.classList.contains("is-start-screen")).toBe(true);
      expect(nameEntry.classList.contains("is-hidden")).toBe(false);
      expect(nextButton.disabled).toBe(true);
      expect(nextHint.classList.contains("is-hidden")).toBe(false);
    });

    it("shows the empty next hint when no name has been entered", async () => {
      await setupApp();

      const nextHint = document.getElementById("nextHint") as HTMLElement;
      expect(nextHint.textContent).toBe("Type your name to begin the mission.");
    });

    it("shows the ready next hint when a name is entered", async () => {
      await setupApp();

      const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
      nameInput.value = "Alex";
      nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));

      const nextHint = document.getElementById("nextHint") as HTMLElement;
      expect(nextHint.textContent).toBe("Press Enter to start Mission 1: Verbal Challenge.");
    });

    it("shows the story-only ready hints when story mode is enabled and a name is entered", async () => {
      await setupApp(attemptQuestion, { storyOnly: true });

      const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
      nameInput.value = "Alex";
      nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));

      const nameHint = document.getElementById("nameHint") as HTMLElement;
      const nextHint = document.getElementById("nextHint") as HTMLElement;
      expect(nameHint.textContent).toBe("Press Enter to begin Story Only mode.");
      expect(nextHint.textContent).toBe("Press Enter to play the story route.");
    });

    it("does not start the attempt when Enter is pressed before a name is entered", async () => {
      const mocks = await setupApp();

      const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
      nameInput.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      await Promise.resolve();

      expect(mocks.beginAttempt).not.toHaveBeenCalled();
      expect(document.getElementById("questionPanel")?.classList.contains("is-start-screen")).toBe(true);
      expect(document.getElementById("nextHint")?.textContent).toBe("Type your name to begin the mission.");
    });
  });

  describe("renderStoryOnlyQuestion", () => {
  it("renders the story-only prompt with button disabled after starting in story-only mode", async () => {
      await startApp(attemptQuestion, { storyOnly: true });

      const questionCounter = document.getElementById("questionCounter") as HTMLElement;
      const questionPrompt = document.getElementById("questionPrompt") as HTMLElement;
      const optionsList = document.getElementById("optionsList") as HTMLUListElement;
      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      const nextHint = document.getElementById("nextHint") as HTMLElement;

      expect(questionCounter.textContent).toContain("story route");
      expect(questionPrompt.textContent).toBe(
        "Story Only mode is on. Follow Captain Nova through each mission scene.",
      );
      expect(optionsList.children).toHaveLength(0);
      expect(nextButton.disabled).toBe(true);
      expect(nextHint.textContent).toBe("Use the modal button to continue the story.");
    });
  });

  describe("story progression", () => {
    it("advances the story overlays and finishes in the story-only results view", async () => {
      const { gamificationController, overlayStateChange } = await startApp(attemptQuestion, { storyOnly: true });

      expect(overlayStateChange).toBeTypeOf("function");

      overlayStateChange?.({
        hasBlocking: false,
        dismissedEvent: { variant: "intro", sectionKey: "Verbal" },
      });
      expect(gamificationController.showMissionUpdate).toHaveBeenCalledWith("Verbal");

      overlayStateChange?.({
        hasBlocking: false,
        dismissedEvent: { variant: "midpoint", sectionKey: "Verbal" },
      });
      expect(gamificationController.showMissionCompletion).toHaveBeenCalledWith("Verbal");

      overlayStateChange?.({
        hasBlocking: false,
        dismissedEvent: { variant: "section", sectionKey: "Verbal" },
      });

      expect(gamificationController.onTestCompleted).toHaveBeenCalled();
      expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(false);
      expect(document.getElementById("scoreHeadline")?.textContent).toBe(
        "Alex completed Captain Nova's full story route.",
      );
      expect(document.getElementById("timeSummary")?.textContent).toBe(
        "Story Only mode keeps the focus on the adventure, so mission timing is turned off.",
      );
      expect(document.querySelector("#reviewList .review-card h4")?.textContent).toBe("Legendary Launch");
    });

    it("ignores unrecognized story-only overlay dismissals", async () => {
      const { gamificationController, overlayStateChange } = await startApp(attemptQuestion, { storyOnly: true });

      overlayStateChange?.({
        hasBlocking: false,
        dismissedEvent: { variant: "other", sectionKey: "Verbal" },
      });

      expect(gamificationController.showMissionUpdate).not.toHaveBeenCalled();
      expect(gamificationController.showMissionCompletion).not.toHaveBeenCalled();
      expect(gamificationController.onTestCompleted).not.toHaveBeenCalled();
      expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(true);
      expect(document.getElementById("questionCounter")?.textContent).toBe("Mission 1 story route");
    });
  });

  describe("renderOptions", () => {
    it("renders all option buttons with no selection state when nothing selected", async () => {
      await startApp();

      const buttons = Array.from(
        document.querySelectorAll("#optionsList button"),
      ) as HTMLButtonElement[];
      expect(buttons).toHaveLength(4);
      buttons.forEach((btn) => {
        expect(btn.classList.contains("is-selected")).toBe(false);
        expect(btn.classList.contains("is-correct")).toBe(false);
        expect(btn.classList.contains("is-wrong")).toBe(false);
        expect(btn.disabled).toBe(false);
      });
    });

    it("marks the clicked option as selected", async () => {
      await startApp();

      const buttons = Array.from(
        document.querySelectorAll("#optionsList button"),
      ) as HTMLButtonElement[];
      buttons[1].click();

      const updatedButtons = Array.from(
        document.querySelectorAll("#optionsList button"),
      ) as HTMLButtonElement[];
      expect(updatedButtons[1].classList.contains("is-selected")).toBe(true);
    });

    it("renders option text via textContent (no HTML injection from option strings)", async () => {
      const xssQuestion = {
        ...attemptQuestion,
        options: ['<img src=x onerror="window.__xssHit=true">', "Beta", "Gamma", "Delta"],
      };
      await startApp(xssQuestion);

      const firstButton = document.querySelector("#optionsList button") as HTMLButtonElement;
      const optionText = firstButton.querySelector(".option-text") as HTMLElement;
      expect(optionText.textContent).toContain("<img");
      expect(firstButton.querySelector("img")).toBeNull();
      expect((window as Window & typeof globalThis & Record<string, unknown>).__xssHit).toBeUndefined();
    });

    it("shows rationale on the correct answer button when a wrong answer is validated", async () => {
      const { recordValidatedAnswer } = await startApp();

      recordValidatedAnswer.mockResolvedValue({
        accepted: true,
        correctAnswer: attemptQuestion.answer,
        isCorrect: false,
        progress: { answeredCount: 1, correctCount: 0, totalQuestions: 1, percentage: 0 },
        record: null,
      });

      const buttons = Array.from(
        document.querySelectorAll("#optionsList button"),
      ) as HTMLButtonElement[];
      buttons[0].click();

      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      nextButton.click();

      await Promise.resolve();
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      const correctButton = document.querySelectorAll("#optionsList button")[attemptQuestion.answer] as HTMLButtonElement;
      const rationale = correctButton.querySelector(".option-rationale");
      expect(rationale).not.toBeNull();
      expect(rationale?.textContent).toContain(attemptQuestion.explanation);
      expect(correctButton.classList.contains("is-correct")).toBe(true);
      expect((document.querySelectorAll("#optionsList button")[0] as HTMLButtonElement).classList.contains("is-wrong")).toBe(true);
    });
  });

  describe("renderProgressFill", () => {
    it("upgrades the mission progress bar to semantic markup without inline width styling", async () => {
      await startApp();

      const progressFill = document.getElementById("progressFill") as HTMLProgressElement;

      expect(progressFill.tagName).toBe("PROGRESS");
      expect(progressFill.max).toBe(100);
      expect(progressFill.value).toBe(0);
      expect(progressFill.getAttribute("style")).toBeNull();
    });

    it("updates the progress value when a question is validated", async () => {
      await startApp();

      const buttons = Array.from(
        document.querySelectorAll("#optionsList button"),
      ) as HTMLButtonElement[];
      buttons[attemptQuestion.answer].click();

      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      nextButton.click();

      await Promise.resolve();
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      const progressFill = document.getElementById("progressFill") as HTMLProgressElement;
      expect(progressFill.value).toBe(100);
      expect(progressFill.getAttribute("style")).toBeNull();
      expect(document.getElementById("answeredCount")?.textContent).toBe("1 of 1");
    });
  });

  describe("renderHintAndButton", () => {
    it("shows select hint and disables next button when no answer is selected", async () => {
      await startApp();

      const nextHint = document.getElementById("nextHint") as HTMLElement;
      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      expect(nextHint.textContent).toBe("Choose an answer to power up Check Answer.");
      expect(nextButton.disabled).toBe(true);
    });

    it("shows validate hint and enables next button after selecting an answer", async () => {
      await startApp();

      const buttons = Array.from(
        document.querySelectorAll("#optionsList button"),
      ) as HTMLButtonElement[];
      buttons[1].click();

      const nextHint = document.getElementById("nextHint") as HTMLElement;
      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      expect(nextHint.textContent).toBe("Press Check Answer to power the next rocket step.");
      expect(nextButton.disabled).toBe(false);
    });

    it("shows all-answered hint and launch button after validating the last question", async () => {
      const { recordValidatedAnswer } = await startApp();

      recordValidatedAnswer.mockResolvedValue({
        accepted: true,
        correctAnswer: attemptQuestion.answer,
        isCorrect: true,
        progress: { answeredCount: 1, correctCount: 1, totalQuestions: 1, percentage: 100 },
        record: {
          playerName: "Alex",
          score: 1,
          totalQuestions: 1,
          percentage: 100,
          elapsedSeconds: 10,
        },
      });

      const buttons = Array.from(
        document.querySelectorAll("#optionsList button"),
      ) as HTMLButtonElement[];
      buttons[attemptQuestion.answer].click();

      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      nextButton.click();

      await Promise.resolve();
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      const nextHint = document.getElementById("nextHint") as HTMLElement;
      expect(nextHint.textContent).toContain("All");
      expect(nextHint.textContent).toContain("mission steps are complete");
      expect(nextButton.textContent).toBe("Launch the Rocket");
    });

    it("hides the next hint after submitting", async () => {
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

      const nextHint = document.getElementById("nextHint") as HTMLElement;
      expect(nextHint.classList.contains("is-hidden")).toBe(true);
    });

    it("still allows answering without a scoreboard controller and finishes the attempt", async () => {
      await setupApp(attemptQuestion, { scoreboard: false });

      const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
      nameInput.value = "Alex";
      nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
      nameInput.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      await Promise.resolve();

      await completeSingleQuestionFlow(attemptQuestion.answer);

      expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(false);
      expect(document.querySelector("#reviewList .review-card h4")?.textContent).toBe("Legendary Launch");
    });

    it("still finishes the attempt when scoreboard answer sync fails", async () => {
      const { recordValidatedAnswer } = await startApp();
      recordValidatedAnswer.mockRejectedValueOnce(new Error("sync failed"));
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await completeSingleQuestionFlow(attemptQuestion.answer);

      expect(errorSpy).toHaveBeenCalledWith("[CaptainNova] Attempt answer sync failed.", expect.any(Error));
      expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(false);
      expect(document.querySelector("#reviewList .review-card h4")?.textContent).toBe("Legendary Launch");
    });

    it("ignores non-Enter keys in the child name input", async () => {
      const mocks = await setupApp();
      const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
      nameInput.value = "Alex";
      nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
      nameInput.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Tab", bubbles: true }));

      await Promise.resolve();

      expect(mocks.beginAttempt).not.toHaveBeenCalled();
      expect(document.getElementById("questionPanel")?.classList.contains("is-start-screen")).toBe(true);
    });

    it("scrolls back to the question panel when the back button is pressed", async () => {
      await startApp();

      const backButton = document.getElementById("backToQuestionsButton") as HTMLButtonElement;
      backButton.click();

      expect(window.Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
      expect(window.Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    });

    it("ignores next-button clicks before an answer has been selected", async () => {
      const { recordValidatedAnswer } = await setupApp();

      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      nextButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

      expect(recordValidatedAnswer).not.toHaveBeenCalled();
      expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(true);
    });

    it("ignores next-button clicks while story-only mode is active", async () => {
      const { recordValidatedAnswer } = await startApp(attemptQuestion, { storyOnly: true });

      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      nextButton.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));

      expect(recordValidatedAnswer).not.toHaveBeenCalled();
      expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(true);
      expect(document.getElementById("questionCounter")?.textContent).toBe("Mission 1 story route");
    });

    it("ignores standard overlay dismissals that are not section completions", async () => {
      const { finalizeAttempt, overlayStateChange, recordValidatedAnswer } = await startApp();
      recordValidatedAnswer.mockResolvedValue({
        accepted: true,
        correctAnswer: attemptQuestion.answer,
        isCorrect: false,
        progress: {
          answeredCount: 1,
          correctCount: 0,
          totalQuestions: 1,
          percentage: 0,
        },
        record: null,
      });

      const buttons = Array.from(
        document.querySelectorAll("#optionsList button"),
      ) as HTMLButtonElement[];
      buttons[attemptQuestion.answer].click();

      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      nextButton.click();

      await Promise.resolve();
      await Promise.resolve();

      overlayStateChange?.({
        hasBlocking: false,
        dismissedEvent: { variant: "intro", sectionKey: "Verbal" },
      });

      expect(finalizeAttempt).not.toHaveBeenCalled();
      expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(true);
    });

    it("suppresses the next-button advance briefly after a section overlay dismissal", async () => {
      const { overlayStateChange, recordValidatedAnswer } = await startApp();
      const buttons = Array.from(
        document.querySelectorAll("#optionsList button"),
      ) as HTMLButtonElement[];
      buttons[attemptQuestion.answer].click();

      overlayStateChange?.({
        hasBlocking: false,
        dismissedEvent: {
          variant: "section",
          advanceOnDismiss: false,
          sectionKey: "Verbal",
        },
      });

      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      nextButton.click();

      expect(recordValidatedAnswer).not.toHaveBeenCalled();
    });

    it("advances to the next mission when a section overlay says to advance on dismiss", async () => {
      const { finalizeAttempt, overlayStateChange, recordValidatedAnswer } = await startApp();
      recordValidatedAnswer.mockResolvedValue({
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

      const buttons = Array.from(
        document.querySelectorAll("#optionsList button"),
      ) as HTMLButtonElement[];
      buttons[attemptQuestion.answer].click();

      const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
      nextButton.click();

      await Promise.resolve();
      await Promise.resolve();

      overlayStateChange?.({
        hasBlocking: false,
        dismissedEvent: {
          variant: "section",
          advanceOnDismiss: true,
          sectionKey: "Verbal",
        },
      });

      await Promise.resolve();

      expect(finalizeAttempt).toHaveBeenCalledTimes(1);
      expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(false);
    });

    it("auto-advances after a correct answer when no blocking overlay is active", async () => {
      vi.useFakeTimers();
      try {
        const { recordValidatedAnswer } = await setupApp(attemptQuestion, { blockingOverlay: false });
        recordValidatedAnswer.mockResolvedValue({
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

        const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
        nameInput.value = "Alex";
        nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
        nameInput.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        await Promise.resolve();
        await Promise.resolve();

        const buttons = Array.from(
          document.querySelectorAll("#optionsList button"),
        ) as HTMLButtonElement[];
        buttons[attemptQuestion.answer].click();

        const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
        nextButton.click();

        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(1000);
        await Promise.resolve();

        expect(recordValidatedAnswer).toHaveBeenCalledTimes(1);
        expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(false);
        expect(document.querySelector("#reviewList .review-card h4")?.textContent).toBe("Legendary Launch");
      } finally {
        vi.useRealTimers();
      }
    });

    it("auto-advances to the next question when one remains", async () => {
      vi.useFakeTimers();
      try {
        const followUpQuestion = {
          ...attemptQuestion,
          id: 2,
          bankId: "Verbal-2",
          prompt: "Which answer keeps the rocket steady?",
          options: ["North", "East", "South", "West"],
          answer: 1,
          explanation: "East keeps the rocket on course.",
        };
        const { finalizeAttempt, recordValidatedAnswer } = await setupAppWithQuestions(
          [attemptQuestion, followUpQuestion],
          { blockingOverlay: false },
        );
        recordValidatedAnswer.mockResolvedValue({
          accepted: true,
          correctAnswer: attemptQuestion.answer,
          isCorrect: true,
          progress: {
            answeredCount: 1,
            correctCount: 1,
            totalQuestions: 2,
            percentage: 50,
          },
          record: null,
        });

        const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
        nameInput.value = "Alex";
        nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
        nameInput.dispatchEvent(
          new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        );

        await Promise.resolve();
        await Promise.resolve();

        const buttons = Array.from(
          document.querySelectorAll("#optionsList button"),
        ) as HTMLButtonElement[];
        buttons[attemptQuestion.answer].click();

        const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
        nextButton.click();

        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(1000);
        await Promise.resolve();

        expect(recordValidatedAnswer).toHaveBeenCalledTimes(1);
        expect(finalizeAttempt).not.toHaveBeenCalled();
        expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(true);
        expect(document.getElementById("questionPrompt")?.textContent).toBe(followUpQuestion.prompt);
      } finally {
        vi.useRealTimers();
      }
    });

    it("resumes the deferred auto-advance after a blocking overlay is dismissed", async () => {
      vi.useFakeTimers();
      try {
        const { recordValidatedAnswer, finalizeAttempt, overlayStateChange } = await setupApp();
        recordValidatedAnswer.mockResolvedValue({
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

        const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
        nameInput.value = "Alex";
        nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
        nameInput.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        await Promise.resolve();
        await Promise.resolve();

        const buttons = Array.from(
          document.querySelectorAll("#optionsList button"),
        ) as HTMLButtonElement[];
        buttons[attemptQuestion.answer].click();

        const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
        nextButton.click();

        await Promise.resolve();
        await Promise.resolve();

        overlayStateChange?.({
          hasBlocking: false,
          dismissedEvent: null,
        });

        await vi.advanceTimersByTimeAsync(1000);
        await Promise.resolve();

        expect(recordValidatedAnswer).toHaveBeenCalledTimes(1);
        expect(finalizeAttempt).toHaveBeenCalledTimes(1);
        expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(false);
        expect(document.getElementById("scoreHeadline")?.textContent).toContain("Alex powered 1/1 mission steps (100%)");
      } finally {
        vi.useRealTimers();
      }
    });

    it("resumes deferred auto-advance to the next question after the overlay is dismissed", async () => {
      vi.useFakeTimers();
      try {
        const followUpQuestion = {
          ...attemptQuestion,
          id: 2,
          bankId: "Verbal-2",
          prompt: "Which answer keeps the rocket steady?",
          options: ["North", "East", "South", "West"],
          answer: 1,
          explanation: "East keeps the rocket on course.",
        };
        const { finalizeAttempt, overlayStateChange, recordValidatedAnswer } = await setupAppWithQuestions(
          [attemptQuestion, followUpQuestion],
        );
        recordValidatedAnswer.mockResolvedValue({
          accepted: true,
          correctAnswer: attemptQuestion.answer,
          isCorrect: true,
          progress: {
            answeredCount: 1,
            correctCount: 1,
            totalQuestions: 2,
            percentage: 50,
          },
          record: null,
        });

        const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
        nameInput.value = "Alex";
        nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
        nameInput.dispatchEvent(
          new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        );

        await Promise.resolve();
        await Promise.resolve();

        const buttons = Array.from(
          document.querySelectorAll("#optionsList button"),
        ) as HTMLButtonElement[];
        buttons[attemptQuestion.answer].click();

        const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
        nextButton.click();

        await Promise.resolve();
        await Promise.resolve();

        overlayStateChange?.({
          hasBlocking: false,
          dismissedEvent: null,
        });

        await vi.advanceTimersByTimeAsync(1000);
        await Promise.resolve();

        expect(recordValidatedAnswer).toHaveBeenCalledTimes(1);
        expect(finalizeAttempt).not.toHaveBeenCalled();
        expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(true);
        expect(document.getElementById("questionPrompt")?.textContent).toBe(followUpQuestion.prompt);
      } finally {
        vi.useRealTimers();
      }
    });

    it("resolves the selected-answer and mission-transition hint and button states", async () => {
      const { resolveNextHintText, resolveNextButtonText, shouldDisableNextButton } = await loadAppHelpers();

      expect(
        resolveNextHintText(
          {
            selectedAnswer: null,
            validatedAnswer: null,
            isSubmitted: false,
            isAutoAdvancing: false,
            isAwaitingAnswerSync: false,
            isMissionTransitionReady: false,
          },
          false,
        ),
      ).toBe("Choose an answer to power up Check Answer.");
      expect(
        resolveNextHintText(
          {
            selectedAnswer: 1,
            validatedAnswer: null,
            isSubmitted: false,
            isAutoAdvancing: false,
            isAwaitingAnswerSync: false,
            isMissionTransitionReady: false,
          },
          false,
        ),
      ).toBe("Press Check Answer to power the next rocket step.");
      expect(
        resolveNextButtonText(
          {
            validatedAnswer: null,
            isSubmitted: false,
            isMissionTransitionReady: false,
          },
          false,
        ),
      ).toBe("Check Answer");
      expect(
        resolveNextHintText(
          {
            selectedAnswer: 1,
            validatedAnswer: 1,
            isSubmitted: false,
            isAutoAdvancing: true,
            isAwaitingAnswerSync: false,
            isMissionTransitionReady: false,
          },
          false,
        ),
      ).toBe("Rocket step locked in. Loading the next mission step...");
      expect(
        resolveNextHintText(
          {
            selectedAnswer: 1,
            validatedAnswer: 1,
            isSubmitted: false,
            isAutoAdvancing: false,
            isAwaitingAnswerSync: true,
            isMissionTransitionReady: false,
          },
          false,
        ),
      ).toBe("Mission Control is checking that answer...");
      expect(
        resolveNextHintText(
          {
            selectedAnswer: 1,
            validatedAnswer: 1,
            isSubmitted: false,
            isAutoAdvancing: false,
            isAwaitingAnswerSync: false,
            isMissionTransitionReady: false,
          },
          true,
        ),
      ).toContain("All 1 mission steps are complete");
      expect(
        resolveNextHintText(
          {
            selectedAnswer: 1,
            validatedAnswer: 1,
            isSubmitted: false,
            isAutoAdvancing: false,
            isAwaitingAnswerSync: false,
            isMissionTransitionReady: false,
          },
          false,
        ),
      ).toBe("Rocket step locked in. Press Next Mission Step.");
      expect(
        resolveNextHintText(
          {
            selectedAnswer: 1,
            validatedAnswer: 1,
            isSubmitted: false,
            isAutoAdvancing: false,
            isAwaitingAnswerSync: false,
            isMissionTransitionReady: true,
          },
          false,
        ),
      ).toContain("Rocket part secured");
      expect(
        resolveNextButtonText(
          {
            validatedAnswer: 1,
            isSubmitted: false,
            isMissionTransitionReady: false,
          },
          true,
        ),
      ).toBe("Launch the Rocket");
      expect(
        resolveNextButtonText(
          {
            validatedAnswer: 1,
            isSubmitted: true,
            isMissionTransitionReady: false,
          },
          false,
        ),
      ).toBe("Mission Complete");
      expect(
        resolveNextButtonText(
          {
            validatedAnswer: 1,
            isSubmitted: false,
            isMissionTransitionReady: true,
          },
          false,
        ),
      ).toBe("Next mission");
      expect(
        resolveNextButtonText(
          {
            validatedAnswer: 1,
            isSubmitted: false,
            isMissionTransitionReady: false,
          },
          false,
        ),
      ).toBe("Next Mission Step");
      expect(
        shouldDisableNextButton({
          selectedAnswer: null,
          validatedAnswer: null,
          isSubmitted: false,
          isAutoAdvancing: false,
          isAwaitingAnswerSync: false,
        }),
      ).toBe(true);
      expect(
        shouldDisableNextButton({
          selectedAnswer: 1,
          validatedAnswer: 1,
          isSubmitted: false,
          isAutoAdvancing: true,
          isAwaitingAnswerSync: false,
        }),
      ).toBe(true);
      expect(
        shouldDisableNextButton({
          selectedAnswer: 1,
          validatedAnswer: 1,
          isSubmitted: false,
          isAutoAdvancing: false,
          isAwaitingAnswerSync: true,
        }),
      ).toBe(true);
      expect(
        shouldDisableNextButton({
          selectedAnswer: 1,
          validatedAnswer: 1,
          isSubmitted: true,
          isAutoAdvancing: false,
          isAwaitingAnswerSync: false,
        }),
      ).toBe(true);
      expect(
        shouldDisableNextButton({
          selectedAnswer: 1,
          validatedAnswer: 1,
          isSubmitted: false,
          isAutoAdvancing: false,
          isAwaitingAnswerSync: false,
        }),
      ).toBe(false);
    });
  });

  describe("timer handling", () => {
    it("submits the attempt when the mission timer expires", async () => {
      vi.useFakeTimers();
      try {
        const { finalizeAttempt } = await setupApp();

        const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
        nameInput.value = "Alex";
        nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
        nameInput.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        await Promise.resolve();
        await Promise.resolve();

        await vi.advanceTimersByTimeAsync(30000);
        await Promise.resolve();

        expect(finalizeAttempt).toHaveBeenCalledTimes(1);
        expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(false);
        expect(document.getElementById("scoreHeadline")?.textContent).toContain("Alex powered 0/1 mission steps (0%)");
      } finally {
        vi.useRealTimers();
      }
    });

    it("pauses the mission timer while a blocking overlay is active and resumes through retry", async () => {
      vi.useFakeTimers();
      try {
        const { finalizeAttempt, overlayStateChange } = await setupApp();

        const nameInput = document.getElementById("childNameInput") as HTMLInputElement;
        nameInput.value = "Alex";
        nameInput.dispatchEvent(new window.Event("input", { bubbles: true }));
        nameInput.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        await Promise.resolve();
        await Promise.resolve();

        overlayStateChange?.({
          hasBlocking: true,
          dismissedEvent: null,
        });

        await vi.advanceTimersByTimeAsync(30000);
        await Promise.resolve();

        expect(finalizeAttempt).not.toHaveBeenCalled();
        expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(true);
        expect(document.getElementById("timerDisplay")?.textContent).toBe("00:30");

        overlayStateChange?.({
          hasBlocking: false,
          dismissedEvent: null,
        });

        await vi.advanceTimersByTimeAsync(30000);
        await Promise.resolve();

        expect(finalizeAttempt).toHaveBeenCalledTimes(1);
        expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(false);

        const retryButton = document.getElementById("retryButton") as HTMLButtonElement;
        retryButton.click();

        expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(true);
        expect(document.getElementById("questionPanel")?.classList.contains("is-start-screen")).toBe(true);
        expect((document.getElementById("childNameInput") as HTMLInputElement).value).toBe("");
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe("normalizeAttemptQuestion", () => {
    it("returns null for non-object input", async () => {
      const normalizeAttemptQuestion = await loadNormalizeAttemptQuestion();

      expect(normalizeAttemptQuestion(null, 0)).toBeNull();
      expect(normalizeAttemptQuestion("bad-input", 0)).toBeNull();
    });

    it("fills missing prompt, section, explanation, stimulus, and options from the canonical question", async () => {
      const normalizeAttemptQuestion = await loadNormalizeAttemptQuestion();

      const normalized = normalizeAttemptQuestion(
        {
          bankId: "Verbal-1",
          id: 7,
          answer: 2,
        },
        0,
      );

      expect(normalized).toMatchObject({
        id: 7,
        questionId: 7,
        bankId: "Verbal-1",
        section: "Verbal",
        prompt: attemptQuestion.prompt,
        explanation: attemptQuestion.explanation,
        stimulus: "",
        options: attemptQuestion.options,
        answer: 2,
      });
    });

    it("derives the answer index from the canonical correct option when only shuffled options are provided", async () => {
      const normalizeAttemptQuestion = await loadNormalizeAttemptQuestion();

      const normalized = normalizeAttemptQuestion(
        {
          bankId: "Verbal-1",
          questionId: 9,
          section: "Verbal",
          prompt: attemptQuestion.prompt,
          options: ["Gamma", "Alpha", "Beta", "Delta"],
          explanation: attemptQuestion.explanation,
        },
        0,
      );

      expect(normalized).toMatchObject({
        id: 9,
        questionId: 9,
        answer: 0,
      });
      expect(normalized?.options).toEqual(["Gamma", "Alpha", "Beta", "Delta"]);
    });

    it("prefers an explicit correctAnswer over the derived fallback and keeps stringified options", async () => {
      const normalizeAttemptQuestion = await loadNormalizeAttemptQuestion();

      const normalized = normalizeAttemptQuestion(
        {
          bankId: "Verbal-1",
          section: "Verbal",
          prompt: attemptQuestion.prompt,
          correctAnswer: 1,
          options: ["Alpha", 22, "Gamma", "Delta"],
          explanation: attemptQuestion.explanation,
        },
        4,
      );

      expect(normalized).toMatchObject({
        id: 5,
        questionId: 5,
        answer: 1,
      });
      expect(normalized?.options).toEqual(["Alpha", "22", "Gamma", "Delta"]);
    });
  });

  describe("renderRocketSceneMarkup", () => {
    it("uses discrete fuel level classes instead of inline styles", async () => {
      const { renderRocketSceneMarkup } = await loadAppHelpers();

      const markup = renderRocketSceneMarkup(4, 5);
      const container = document.createElement("div");
      container.innerHTML = markup;

      const fuelFill = container.querySelector(".rocket-fuel-fill");

      expect(fuelFill?.classList.contains("rocket-fuel-level-5")).toBe(true);
      expect(fuelFill?.getAttribute("style")).toBeNull();
    });
  });

  describe("overlay and answer helpers", () => {
    it("maps overlay dismissal variants to the expected follow-up action", async () => {
      const {
        getStoryOnlyOverlayDismissalAction,
        getSectionOverlayDismissalAction,
        handleStoryOnlyOverlayDismissal,
        handleStandardOverlayDismissal,
        shouldResumeDeferredAutoAdvance,
      } = await loadAppHelpers();

      expect(getStoryOnlyOverlayDismissalAction({ variant: "intro", sectionKey: "Verbal" })).toBe("showMissionUpdate");
      expect(getStoryOnlyOverlayDismissalAction({ variant: "midpoint", sectionKey: "Verbal" })).toBe("showMissionCompletion");
      expect(getStoryOnlyOverlayDismissalAction({ variant: "section", sectionKey: "Verbal" })).toBe("completeSection");
      expect(getStoryOnlyOverlayDismissalAction({ variant: "other" })).toBeNull();

      expect(getSectionOverlayDismissalAction({ variant: "section", advanceOnDismiss: false })).toBe("suppressNextButton");
      expect(getSectionOverlayDismissalAction({ variant: "section", advanceOnDismiss: true })).toBe("advanceToNextMission");
      expect(getSectionOverlayDismissalAction({ variant: "intro" })).toBeNull();

      expect(handleStoryOnlyOverlayDismissal({ variant: "other" })).toBe(false);
      expect(handleStandardOverlayDismissal({ variant: "intro" })).toBe(false);
      expect(shouldResumeDeferredAutoAdvance(true)).toBe(false);
    });

    it("handles standard section overlay dismissals for both suppress and advance branches", async () => {
      const { overlayStateChange, finalizeAttempt, gamificationController } = await startApp();

      overlayStateChange?.({
        hasBlocking: false,
        dismissedEvent: { variant: "section", advanceOnDismiss: false },
      });
      expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(true);
      expect(finalizeAttempt).not.toHaveBeenCalled();

      overlayStateChange?.({
        hasBlocking: false,
        dismissedEvent: { variant: "section", advanceOnDismiss: true },
      });

      expect(gamificationController.requestMissionIntroduction).toHaveBeenCalledTimes(1);
      expect(document.getElementById("resultsSection")?.classList.contains("is-hidden")).toBe(true);
    });

    it("prefers the scoreboard answer when it is valid and falls back cleanly otherwise", async () => {
      const {
        resolveAuthoritativeCorrectAnswer,
        resolveAnswerEvaluationIsCorrect,
      } = await loadAppHelpers();

      expect(resolveAuthoritativeCorrectAnswer({ correctAnswer: 3 }, 1)).toBe(3);
      expect(resolveAuthoritativeCorrectAnswer({ correctAnswer: 9 }, 1)).toBe(1);
      expect(resolveAuthoritativeCorrectAnswer({ correctAnswer: -1 }, 2)).toBe(2);
      expect(resolveAuthoritativeCorrectAnswer(null, 2)).toBe(2);

      expect(resolveAnswerEvaluationIsCorrect({ isCorrect: true }, 0, 2)).toBe(true);
      expect(resolveAnswerEvaluationIsCorrect({ isCorrect: false }, 2, 2)).toBe(false);
      expect(resolveAnswerEvaluationIsCorrect(null, 2, 2)).toBe(true);
      expect(resolveAnswerEvaluationIsCorrect(null, 1, 2)).toBe(false);
    });

    it("ignores answer sync requests for questions that are no longer active", async () => {
      const { gamificationController } = await setupApp();
      const syncAnswerEvaluation = window.eval("syncAnswerEvaluation") as (
        questionIndex: number,
        question: typeof attemptQuestion,
        selectedAnswer: number,
        result: Record<string, unknown> | null,
      ) => void;

      syncAnswerEvaluation(99, attemptQuestion, attemptQuestion.answer, {
        correctAnswer: attemptQuestion.answer,
        isCorrect: true,
      });

      expect(gamificationController.onAnswerEvaluated).not.toHaveBeenCalled();
    });
  });
});

