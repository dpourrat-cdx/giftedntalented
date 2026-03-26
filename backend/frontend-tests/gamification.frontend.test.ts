// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { importBrowserScript, resetBrowserGlobals } from "./helpers/browser-script";

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

describe("gamification.js targeted coverage", () => {
  beforeEach(() => {
    vi.resetModules();
    resetBrowserGlobals();
    vi.restoreAllMocks();
  });

  it("exposes the reduced-motion helper and returns the matchMedia verdict", async () => {
    Object.assign(window, {
      __GiftedExposeTestUtils: true,
    });
    Object.assign(globalThis as Record<string, unknown>, {
      __GiftedExposeTestUtils: true,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });

    await importBrowserScript("gamification.js");

    expect(window.GiftedGamification.__testPrefersReducedMotion()).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });

  it("runs the overlay reset path through controller.reset()", async () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });

    await importBrowserScript("gamification.js");

    const controller = window.GiftedGamification.createGamificationController({
      themeId: "rocket-adventure",
      roots: buildRoots(),
      callbacks: {},
    });

    controller.reset();

    expect(document.getElementById("overlayRoot")?.innerHTML).toBe("");
    expect(document.getElementById("hud")?.classList.contains("is-hidden")).toBe(true);
  });
});
