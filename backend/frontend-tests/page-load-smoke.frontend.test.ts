// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { importBrowserScript, loadIndexHtml, resetBrowserGlobals } from "./helpers/browser-script";

function buildGamificationStub() {
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
}

async function bootApp() {
  await loadIndexHtml();
  await importBrowserScript("content.js");

  window.GiftedQuestionBank = {
    SECTIONS: ["Verbal"],
    QUESTIONS_PER_TEST_SECTION: 1,
    buildTestSession() {
      return [];
    },
    getQuestionPool() {
      return { Verbal: [] };
    },
  };

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
        beginAttempt: vi.fn().mockResolvedValue(null),
        recordValidatedAnswer: vi.fn().mockResolvedValue(null),
        finalizeAttempt: vi.fn().mockResolvedValue(null),
      };
    },
  };

  await importBrowserScript("app.js");
  await Promise.resolve();
  await new Promise((resolve) => window.setTimeout(resolve, 0));
}

describe("page load smoke", () => {
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

  it("renders the page shell anchors from index.html", async () => {
    await loadIndexHtml();

    const scriptSources = Array.from(document.querySelectorAll("script[src]"), (script) =>
      (script as HTMLScriptElement).getAttribute("src") ?? "",
    );

    expect(document.querySelector("main.app-shell")).not.toBeNull();
    expect(document.getElementById("heroTitle")?.textContent).toBe("Captain Nova's Rocket Mission");
    expect(document.getElementById("questionPanel")).not.toBeNull();
    expect(document.getElementById("resultsSection")).not.toBeNull();
    expect(document.getElementById("gamificationOverlayRoot")).not.toBeNull();
    expect(scriptSources.findIndex((src) => src.includes("frame-bust.js"))).toBeLessThan(
      scriptSources.findIndex((src) => src.includes("app.js")),
    );
  });

  it("boots into the initial start-state UI", async () => {
    await bootApp();

    const questionPanel = document.getElementById("questionPanel") as HTMLElement;
    const nameEntry = document.getElementById("nameEntry") as HTMLElement;
    const nextButton = document.getElementById("nextButton") as HTMLButtonElement;
    const nextHint = document.getElementById("nextHint") as HTMLElement;
    const leaderboardName = document.getElementById("leaderboardName") as HTMLElement;
    const leaderboardScore = document.getElementById("leaderboardScore") as HTMLElement;

    expect(questionPanel.classList.contains("is-start-screen")).toBe(true);
    expect(nameEntry.classList.contains("is-hidden")).toBe(false);
    expect(nextButton.disabled).toBe(true);
    expect(nextHint.textContent).toBe("Type your name to begin the mission.");
    expect(leaderboardName.textContent).toBe("Type an explorer name");
    expect(leaderboardScore.textContent).toContain("Enter the explorer name below");
  });
});
