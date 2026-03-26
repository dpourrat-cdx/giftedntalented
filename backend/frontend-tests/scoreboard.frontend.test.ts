// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadFrontendScript, resetFrontendGlobals } from "./helpers/frontend-script";

type ScoreboardController = ReturnType<typeof createController>;

function buildElements() {
  document.body.innerHTML = `
    <strong id="name"></strong>
    <span id="score"></span>
    <p id="status" class="top-score-status is-hidden"></p>
    <button id="resetButton" type="button"></button>
  `;

  return {
    name: document.getElementById("name") as HTMLElement,
    score: document.getElementById("score") as HTMLElement,
    status: document.getElementById("status") as HTMLElement,
    resetButton: document.getElementById("resetButton") as HTMLButtonElement,
  };
}

function createController() {
  const elements = buildElements();
  const controller = window.GiftedScoreboard.createScoreboardController({ elements });
  controller.init();
  return controller;
}

describe("GiftedScoreboard", () => {
  beforeEach(() => {
    resetFrontendGlobals();
    window.CaptainNovaContent = {
      scoreboard: {
        awaitingName: "Type an explorer name",
        awaitingScore: "Enter the explorer name below to show only that explorer's best score.",
        loading: "Checking this explorer's saved record.",
        empty: "No saved record yet for this explorer.",
        localSaveSuccess: "Explorer record saved on this device.",
        deviceOnlyScore: "Showing a score saved only on this device.",
        deviceOnlyWarning: "Explorer record saved on this device. Online sync could not update just now.",
        deviceResetSuccess: "Every saved explorer record on this device has been cleared.",
        allResetSuccess: "Every saved explorer record has been cleared.",
        resetPrompt: "Enter the admin PIN to clear saved explorer records.",
        resetConfirm: "Clear every saved explorer record on this device? This cannot be undone.",
        attemptStartWarning: "This mission can continue, but online score protection could not start right now.",
        attemptSyncWarning: "This mission can continue, but the shared explorer record could not update just now.",
      },
    };
  });

  it("renders the remote score when the lookup succeeds", async () => {
    await loadFrontendScript("scoreboard.js");

    const controller = createController();
    controller.service = {
      fetchPlayerTopScore: vi.fn().mockResolvedValue({
        player_name: "Alex",
        score: 9,
        total_questions: 10,
        percentage: 90,
        elapsed_seconds: 61,
      }),
    };

    const result = await controller.refreshTopScoreForPlayer("Alex");

    expect(result).toEqual({
      playerName: "Alex",
      score: 9,
      totalQuestions: 10,
      percentage: 90,
      elapsedSeconds: 61,
    });
    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.innerHTML).toContain("9/10");
    expect(controller.elements.score.innerHTML).toContain("90%");
    expect(controller.elements.score.innerHTML).toContain("1m 1s");
    expect(controller.elements.status.textContent).toBe("");
  });

  it("falls back to the cached score when the remote lookup returns nothing", async () => {
    await loadFrontendScript("scoreboard.js");

    window.localStorage.setItem(
      "gifted-scoreboard-player-best-scores-v2",
      JSON.stringify({
        alex: {
          playerName: "Alex",
          score: 7,
          totalQuestions: 8,
          percentage: 88,
          elapsedSeconds: 92,
        },
      }),
    );

    const controller = createController();
    controller.service = {
      fetchPlayerTopScore: vi.fn().mockResolvedValue(null),
      saveScore: vi.fn(),
    };

    const result = await controller.refreshTopScoreForPlayer("Alex");

    expect(result).toBeNull();
    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.innerHTML).toContain("7/8");
    expect(controller.elements.score.innerHTML).toContain("88%");
    expect(controller.elements.status.textContent).toBe(
      "Showing a score saved only on this device.",
    );
  });

  it("falls back to the cached score when the remote lookup is unavailable", async () => {
    await loadFrontendScript("scoreboard.js");

    window.localStorage.setItem(
      "gifted-scoreboard-player-best-scores-v2",
      JSON.stringify({
        alex: {
          playerName: "Alex",
          score: 7,
          totalQuestions: 8,
          percentage: 88,
          elapsedSeconds: 92,
        },
      }),
    );

    const controller = createController();
    controller.service = {
      fetchPlayerTopScore: vi.fn().mockRejectedValue(new TypeError("network")),
    };

    const result = await controller.refreshTopScoreForPlayer("Alex");

    expect(result).toEqual({
      playerName: "Alex",
      score: 7,
      totalQuestions: 8,
      percentage: 88,
      elapsedSeconds: 92,
    });
    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.innerHTML).toContain("7/8");
    expect(controller.elements.status.textContent).toBe(
      "Showing a score saved only on this device.",
    );
  });

  it("shows a friendly error when the remote lookup fails without a cached score", async () => {
    await loadFrontendScript("scoreboard.js");

    const controller = createController();
    controller.service = {
      fetchPlayerTopScore: vi.fn().mockRejectedValue(new Error("Remote lookup failed")),
    };

    const result = await controller.refreshTopScoreForPlayer("Alex");

    expect(result).toBeNull();
    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.textContent).toBe("No saved record yet for this explorer.");
    expect(controller.elements.status.textContent).toBe("Remote lookup failed");
  });
});
