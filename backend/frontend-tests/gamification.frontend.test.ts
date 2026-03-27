// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { loadFrontendScript, resetFrontendGlobals } from "./helpers/frontend-script";

function buildRoots() {
  document.body.innerHTML = `
    <section id="hud" class="is-hidden">
      <div id="sectionProgressRoot"></div>
      <div id="overallProgressRoot"></div>
      <div id="rocketProgressRoot"></div>
    </section>
    <div id="questionFeedbackRoot"></div>
    <section id="questionPanel"></section>
    <div id="overlayRoot"></div>
  `;

  return {
    hudRoot: document.getElementById("hud") as HTMLElement,
    sectionProgressRoot: document.getElementById("sectionProgressRoot") as HTMLElement,
    overallProgressRoot: document.getElementById("overallProgressRoot") as HTMLElement,
    rocketProgressRoot: document.getElementById("rocketProgressRoot") as HTMLElement,
    questionFeedbackRoot: document.getElementById("questionFeedbackRoot") as HTMLElement,
    questionPanel: document.getElementById("questionPanel") as HTMLElement,
    overlayRoot: document.getElementById("overlayRoot") as HTMLElement,
  };
}

function buildSnapshot(validatedAnswers: Array<number | null>) {
  return {
    sections: ["Verbal"],
    questionsPerSection: 2,
    sessionQuestions: [
      { id: 1, section: "Verbal", prompt: "Q1" },
      { id: 2, section: "Verbal", prompt: "Q2" },
    ],
    validatedAnswers,
    currentIndex: 1,
    hasStarted: true,
    isSubmitted: false,
    playerName: "Alex",
  };
}

describe("GiftedGamification", () => {
  beforeEach(() => {
    resetFrontendGlobals();
    (window as Window & typeof globalThis & Record<string, unknown>).__GiftedExposeTestUtils = true;
    window.CaptainNovaContent = {
      gamification: {
        sectionCompleteButton: "Next mission",
      },
    };
  });

  afterEach(() => {
    delete (window as Window & typeof globalThis & Record<string, unknown>).__GiftedExposeTestUtils;
    vi.unstubAllGlobals();
  });

  it("renders progress visuals without inline dimension styles", async () => {
    await loadFrontendScript("gamification.js");

    const controller = window.GiftedGamification.createGamificationController({
      themeId: "rocket-adventure",
      roots: buildRoots(),
    });

    controller.sync(buildSnapshot([0, null]));

    const overallFill = document.querySelector("#overallProgressRoot .overall-progress-fill") as SVGRectElement | null;
    expect(overallFill).toBeTruthy();
    expect(overallFill?.getAttribute("width")).toBe("50");
    expect(overallFill?.getAttribute("height")).toBe("12");
    expect(overallFill?.getAttribute("style")).toBeNull();

    const rocketFill = document.querySelector("#rocketProgressRoot .rocket-fuel-fill") as SVGRectElement | null;
    expect(rocketFill).toBeTruthy();
    expect(rocketFill?.getAttribute("height")).toBe("9");
    expect(rocketFill?.getAttribute("y")).toBe("65");
    expect(rocketFill?.getAttribute("style")).toBeNull();
  });

  it("detects reduced motion without optional chaining when matchMedia is missing", async () => {
    vi.stubGlobal("matchMedia", undefined);
    await loadFrontendScript("gamification.js");

    expect(window.GiftedGamification.__testPrefersReducedMotion()).toBe(false);
  });

  it("detects reduced motion when matchMedia matches", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }));
    await loadFrontendScript("gamification.js");

    expect(window.GiftedGamification.__testPrefersReducedMotion()).toBe(true);
  });

  it("renders mission progress and feedback panels with DOM nodes", async () => {
    await loadFrontendScript("gamification.js");

    const controller = window.GiftedGamification.createGamificationController({
      themeId: "rocket-adventure",
      roots: buildRoots(),
    });

    controller.sync(buildSnapshot([0, null]));

    const missionPanel = document.querySelector("#sectionProgressRoot .mission-panel") as HTMLElement | null;
    expect(missionPanel).toBeTruthy();
    expect(missionPanel?.querySelector("strong")?.textContent).toBe("Mission step 2 of 2");
    expect(missionPanel?.querySelectorAll(".mission-dot")).toHaveLength(2);

    controller.onAnswerEvaluated(buildSnapshot([0, 1]), {
      isCorrect: true,
      message: "Brilliant work",
    });

    const toast = document.querySelector("#questionFeedbackRoot .question-feedback-toast") as HTMLElement | null;
    expect(toast).toBeTruthy();
    expect(toast?.querySelector(".question-feedback-effect")?.textContent).toBe("sparkle");
    expect((toast?.querySelector("strong")?.textContent || "").length).toBeGreaterThan(0);
  });

  it("expands celebration artwork with an image node instead of a background style", async () => {
    window.CaptainNovaContent = {
      gamification: {
        sectionCompleteButton: "Next mission",
      },
      story: {
        missions: [
          {
            section: "Verbal",
            title: "Signal Recovery",
            completionArtwork: {
              src: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Crect width='8' height='8' fill='%232a9d8f'/%3E%3C/svg%3E",
              alt: "Signal recovery artwork",
            },
          },
        ],
      },
    };

    await loadFrontendScript("gamification.js");

    const controller = window.GiftedGamification.createGamificationController({
      themeId: "rocket-adventure",
      roots: buildRoots(),
    });

    controller.onAnswerEvaluated(buildSnapshot([0, 1]), {
      isCorrect: true,
      message: "Brilliant work",
    });

    const expandButton = document.querySelector("[data-expand-artwork]") as HTMLButtonElement | null;
    expect(expandButton).toBeTruthy();
    expandButton?.click();

    const canvas = document.querySelector(".celebration-artwork-canvas") as HTMLElement | null;
    const artworkImage = document.querySelector(".celebration-artwork-canvas img") as HTMLImageElement | null;
    expect(canvas).toBeTruthy();
    expect(canvas?.getAttribute("style")).toBeNull();
    expect(artworkImage).toBeTruthy();
    expect(artworkImage?.getAttribute("src")).toContain("data:image/svg+xml");
  });

  it("keeps the mission completion overlay non-advancing after a wrong final answer", async () => {
    await loadFrontendScript("gamification.js");

    const overlayStates: Array<Record<string, unknown>> = [];
    const controller = window.GiftedGamification.createGamificationController({
      themeId: "rocket-adventure",
      roots: buildRoots(),
      callbacks: {
        onOverlayStateChange(state: Record<string, unknown>) {
          overlayStates.push(state);
        },
      },
    });

    controller.onAnswerEvaluated(buildSnapshot([0, 1]), { isCorrect: false, message: "Almost there" });

    const currentEvent = overlayStates.at(-1)?.currentEvent as Record<string, unknown>;
    expect(currentEvent.buttonLabel).toBe("Back to mission");
    expect(currentEvent.advanceOnDismiss).toBe(false);
  });

  it("keeps the mission completion overlay advancing after a correct final answer", async () => {
    await loadFrontendScript("gamification.js");

    const overlayStates: Array<Record<string, unknown>> = [];
    const controller = window.GiftedGamification.createGamificationController({
      themeId: "rocket-adventure",
      roots: buildRoots(),
      callbacks: {
        onOverlayStateChange(state: Record<string, unknown>) {
          overlayStates.push(state);
        },
      },
    });

    controller.onAnswerEvaluated(buildSnapshot([0, 1]), { isCorrect: true, message: "Brilliant work" });

    const currentEvent = overlayStates.at(-1)?.currentEvent as Record<string, unknown>;
    expect(currentEvent.buttonLabel).toBe("Next mission");
    expect(currentEvent.advanceOnDismiss).toBe(true);
  });
});
