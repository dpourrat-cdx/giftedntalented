// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

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
    window.CaptainNovaContent = {
      gamification: {
        sectionCompleteButton: "Next mission",
      },
    };
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
