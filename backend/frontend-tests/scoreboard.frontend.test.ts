// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { importBrowserScript, resetBrowserGlobals } from "./helpers/browser-script";

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

async function loadScoreboardScript() {
  await vi.resetModules();
  await importBrowserScript("scoreboard.js");
}

describe("GiftedScoreboard", () => {
  beforeEach(() => {
    resetBrowserGlobals();
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

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the remote score when the lookup succeeds", async () => {
    await loadScoreboardScript();

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

  it("computes a derived percentage when the remote score omits it", async () => {
    await loadScoreboardScript();

    const controller = createController();
    controller.service = {
      fetchPlayerTopScore: vi.fn().mockResolvedValue({
        player_name: "Alex",
        score: 4,
        total_questions: 5,
        elapsed_seconds: 61,
      }),
    };

    const result = await controller.refreshTopScoreForPlayer("Alex");

    expect(result).toEqual({
      playerName: "Alex",
      score: 4,
      totalQuestions: 5,
      percentage: 80,
      elapsedSeconds: 61,
    });
    expect(controller.elements.score.innerHTML).toContain("80%");
  });

  it("falls back to the cached score when the remote lookup returns nothing", async () => {
    await loadScoreboardScript();

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
    await loadScoreboardScript();

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

  it("shows the empty state when the remote lookup returns no record and no cache exists", async () => {
    await loadScoreboardScript();

    const controller = createController();
    controller.service = {
      fetchPlayerTopScore: vi.fn().mockResolvedValue(null),
      saveScore: vi.fn(),
    };

    const result = await controller.refreshTopScoreForPlayer("Alex");

    expect(result).toBeNull();
    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.textContent).toBe("No saved record yet for this explorer.");
    expect(controller.elements.status.textContent).toBe("");
  });

  it("shows a friendly error when the remote lookup fails without a cached score", async () => {
    await loadScoreboardScript();

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

  it("records a validated answer after starting an attempt and updates the score from the response", async () => {
    await loadScoreboardScript();

    const controller = createController();
    const startAttempt = vi.fn().mockResolvedValue({
      attemptId: "attempt-123",
      questions: [{ questionId: "q1" }],
    });
    const submitAttemptAnswer = vi.fn().mockResolvedValue({
      record: {
        player_name: "Alex",
        score: 9,
        total_questions: 10,
        percentage: 90,
        elapsed_seconds: 61,
      },
    });
    controller.service = {
      startAttempt,
      submitAttemptAnswer,
    };

    const result = await controller.recordValidatedAnswer({
      playerName: "Alex",
      clientType: "web",
      mode: "quiz",
      sessionQuestions: [{ questionId: "q1" }],
      questionId: "q1",
      bankId: "bank-1",
      selectedAnswer: "B",
      elapsedSeconds: 61,
    });

    expect(startAttempt).toHaveBeenCalledWith({
      playerName: "Alex",
      clientType: "web",
      mode: "quiz",
      questions: [],
    });
    expect(submitAttemptAnswer).toHaveBeenCalledWith("attempt-123", {
      questionId: "q1",
      bankId: "bank-1",
      selectedAnswer: "B",
      elapsedSeconds: 61,
    });
    expect(result).toEqual({
      record: {
        player_name: "Alex",
        score: 9,
        total_questions: 10,
        percentage: 90,
        elapsed_seconds: 61,
      },
    });
    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.innerHTML).toContain("9/10");
    expect(controller.elements.score.innerHTML).toContain("90%");
  });

  it("shows an online protection warning when an attempt cannot start", async () => {
    await loadScoreboardScript();

    const controller = createController();
    controller.service = {
      startAttempt: vi.fn().mockRejectedValue(new TypeError("network")),
      submitAttemptAnswer: vi.fn(),
    };

    const result = await controller.recordValidatedAnswer({
      playerName: "Alex",
      clientType: "web",
      mode: "quiz",
      sessionQuestions: [{ questionId: "q1" }],
      questionId: "q1",
      bankId: "bank-1",
      selectedAnswer: "B",
      elapsedSeconds: 61,
    });

    expect(result).toBeNull();
    expect(controller.elements.status.textContent).toBe(
      "This mission can continue, but online score protection could not start right now.",
    );
    expect(controller.elements.status.className).toBe("top-score-status is-info");
  });

  it("clears a transient status message after the timeout elapses", async () => {
    await loadScoreboardScript();
    vi.useFakeTimers();

    const controller = createController();

    controller.setStatus("Explorer record saved on this device.", "success");

    expect(controller.elements.status.textContent).toBe("Explorer record saved on this device.");
    expect(controller.elements.status.className).toBe("top-score-status is-success");

    await vi.advanceTimersByTimeAsync(4499);
    expect(controller.elements.status.textContent).toBe("Explorer record saved on this device.");

    await vi.advanceTimersByTimeAsync(1);
    expect(controller.elements.status.textContent).toBe("");
    expect(controller.elements.status.className).toBe("top-score-status is-hidden");
  });

  it("finalizes an attempt using the in-flight attempt when the active id is not set yet", async () => {
    await loadScoreboardScript();

    const controller = createController();
    const finalizeAttempt = vi.fn().mockResolvedValue({
      record: {
        player_name: "Alex",
        score: 10,
        total_questions: 10,
        percentage: 100,
        elapsed_seconds: 90,
      },
    });
    controller.service = {
      finalizeAttempt,
    };
    controller.activeAttemptId = null;
    controller.activeAttemptPromise = Promise.resolve({ attemptId: "attempt-456" });

    const result = await controller.finalizeAttempt({ elapsedSeconds: 90 });

    expect(finalizeAttempt).toHaveBeenCalledWith("attempt-456", {
      elapsedSeconds: 90,
    });
    expect(result).toEqual({
      record: {
        player_name: "Alex",
        score: 10,
        total_questions: 10,
        percentage: 100,
        elapsed_seconds: 90,
      },
    });
    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.innerHTML).toContain("10/10");
    expect(controller.elements.score.innerHTML).toContain("100%");
  });

  it("does not open the reset dialog when confirmation is declined", async () => {
    await loadScoreboardScript();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(false));
    vi.stubGlobal("prompt", vi.fn());

    const controller = createController();
    controller.service = {
      resetScores: vi.fn(),
    };

    await controller.handleResetClick();

    expect(globalThis.confirm).toHaveBeenCalledWith(
      "Clear every saved explorer record on this device? This cannot be undone.",
    );
    expect(globalThis.prompt).not.toHaveBeenCalled();
    expect(controller.service.resetScores).not.toHaveBeenCalled();
    expect(controller.elements.status.textContent).toBe("");
  });

  it("returns without resetting when the admin PIN dialog is cancelled", async () => {
    await loadScoreboardScript();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("prompt", vi.fn().mockReturnValue(null));

    const controller = createController();
    controller.service = {
      resetScores: vi.fn(),
    };

    await controller.handleResetClick();

    expect(globalThis.confirm).toHaveBeenCalledWith(
      "Clear every saved explorer record on this device? This cannot be undone.",
    );
    expect(globalThis.prompt).toHaveBeenCalledWith("Enter the admin PIN to clear saved explorer records.");
    expect(controller.service.resetScores).not.toHaveBeenCalled();
    expect(controller.elements.status.textContent).toBe("");
  });

  it("rejects a blank admin PIN before attempting a reset", async () => {
    await loadScoreboardScript();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("prompt", vi.fn().mockReturnValue("   "));

    const controller = createController();
    controller.service = {
      resetScores: vi.fn(),
    };

    await controller.handleResetClick();

    expect(globalThis.prompt).toHaveBeenCalledWith("Enter the admin PIN to clear saved explorer records.");
    expect(controller.service.resetScores).not.toHaveBeenCalled();
    expect(controller.elements.status.textContent).toBe("Please enter the admin PIN.");
    expect(controller.elements.status.className).toBe("top-score-status is-error");
  });

  it("falls back to the device-only reset flow when the backend is unavailable", async () => {
    await loadScoreboardScript();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("prompt", vi.fn().mockReturnValue(" 1234 "));
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
    controller.activePlayerName = "Alex";
    controller.service = {
      resetScores: vi.fn().mockRejectedValue(new TypeError("network")),
    };

    await controller.handleResetClick();

    expect(controller.service.resetScores).toHaveBeenCalledWith("1234");
    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.textContent).toBe("No saved record yet for this explorer.");
    expect(controller.elements.status.textContent).toBe(
      "Every saved explorer record on this device has been cleared.",
    );
    expect(controller.elements.status.className).toBe("top-score-status is-success");
    expect(window.localStorage.getItem("gifted-scoreboard-player-best-scores-v2")).toBeNull();
  });

  it("shows the device-only warning when saving a score cannot sync online", async () => {
    await loadScoreboardScript();

    const controller = createController();
    controller.activePlayerName = "Alex";
    controller.service = {
      saveScore: vi.fn().mockRejectedValue(new TypeError("network")),
    };

    const result = await controller.recordScore({
      playerName: "Alex",
      score: 8,
      totalQuestions: 10,
      percentage: 80,
      elapsedSeconds: 61,
      clientType: "web",
      mode: "quiz",
    });

    expect(result).toBe(true);
    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.innerHTML).toContain("8/10");
    expect(controller.elements.score.innerHTML).toContain("80%");
    expect(controller.elements.status.textContent).toBe(
      "Explorer record saved on this device. Online sync could not update just now.",
    );
    expect(controller.elements.status.className).toBe("top-score-status is-info");
  });

  it("keeps the cached best score when a lower score is recorded for the active explorer", async () => {
    await loadScoreboardScript();
    window.localStorage.setItem(
      "gifted-scoreboard-player-best-scores-v2",
      JSON.stringify({
        alex: {
          playerName: "Alex",
          score: 9,
          totalQuestions: 10,
          percentage: 90,
          elapsedSeconds: 61,
        },
      }),
    );

    const controller = createController();
    controller.activePlayerName = "Alex";
    controller.service = {
      saveScore: vi.fn(),
    };

    const result = await controller.recordScore({
      playerName: "Alex",
      score: 8,
      totalQuestions: 10,
      percentage: 80,
      elapsedSeconds: 61,
      clientType: "web",
      mode: "quiz",
    });

    expect(result).toBeNull();
    expect(controller.service.saveScore).not.toHaveBeenCalled();
    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.innerHTML).toContain("9/10");
    expect(controller.elements.score.innerHTML).toContain("90%");
  });

  it("does not resave an identical fingerprint and keeps the rendered score stable", async () => {
    await loadScoreboardScript();

    const controller = createController();
    controller.activePlayerName = "Alex";
    controller.service = {
      saveScore: vi.fn().mockResolvedValue(null),
      fetchPlayerTopScore: vi.fn().mockResolvedValue({
        player_name: "Alex",
        score: 7,
        total_questions: 10,
        percentage: 70,
        elapsed_seconds: 61,
      }),
    };

    const scoreEntry = {
      playerName: "Alex",
      score: 8,
      totalQuestions: 10,
      percentage: 80,
      elapsedSeconds: 61,
      clientType: "web",
      mode: "quiz",
    };

    const firstResult = await controller.recordScore(scoreEntry);
    controller.clearCachedScores();
    const secondResult = await controller.recordScore(scoreEntry);

    expect(firstResult).toBe(true);
    expect(secondResult).toBeNull();
    expect(controller.service.saveScore).toHaveBeenCalledTimes(1);
    expect(controller.elements.score.innerHTML).toContain("8/10");
    expect(controller.elements.score.innerHTML).toContain("80%");
  });

  it("shows the success message after a score saves online", async () => {
    await loadScoreboardScript();

    const controller = createController();
    controller.activePlayerName = "Alex";
    controller.service = {
      saveScore: vi.fn().mockResolvedValue(null),
      fetchPlayerTopScore: vi.fn().mockResolvedValue({
        player_name: "Alex",
        score: 8,
        total_questions: 10,
        percentage: 80,
        elapsed_seconds: 61,
      }),
    };

    const result = await controller.recordScore(
      {
        playerName: "Alex",
        score: 8,
        totalQuestions: 10,
        percentage: 80,
        elapsedSeconds: 61,
        clientType: "web",
        mode: "quiz",
      },
      { showSuccessMessage: true },
    );

    expect(result).toBe(true);
    expect(controller.service.saveScore).toHaveBeenCalledTimes(1);
    expect(controller.elements.status.textContent).toBe("Explorer record saved on this device.");
    expect(controller.elements.status.className).toBe("top-score-status is-success");
  });

  it("ignores score submissions without a player name", async () => {
    await loadScoreboardScript();

    const controller = createController();
    controller.service = {
      saveScore: vi.fn(),
    };

    const result = await controller.recordScore({
      playerName: "   ",
      score: 8,
      totalQuestions: 10,
      percentage: 80,
      elapsedSeconds: 61,
      clientType: "web",
      mode: "quiz",
    });

    expect(result).toBeNull();
    expect(controller.service.saveScore).not.toHaveBeenCalled();
  });

  it("ignores malformed score submissions", async () => {
    await loadScoreboardScript();

    const controller = createController();
    controller.service = {
      saveScore: vi.fn(),
    };

    const result = await controller.recordScore({
      playerName: "Alex",
      score: 8,
      totalQuestions: undefined,
      percentage: 80,
      elapsedSeconds: 61,
      clientType: "web",
      mode: "quiz",
    });

    expect(result).toBeNull();
    expect(controller.service.saveScore).not.toHaveBeenCalled();
  });

  it("ignores non-positive score submissions", async () => {
    await loadScoreboardScript();

    const controller = createController();
    controller.service = {
      saveScore: vi.fn(),
    };

    const result = await controller.recordScore({
      playerName: "Alex",
      score: 0,
      totalQuestions: 10,
      percentage: 0,
      elapsedSeconds: 61,
      clientType: "web",
      mode: "quiz",
    });

    expect(result).toBeNull();
    expect(controller.service.saveScore).not.toHaveBeenCalled();
  });

  it("uses the online reset flow when the backend reset succeeds", async () => {
    await loadScoreboardScript();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("prompt", vi.fn().mockReturnValue(" 1234 "));
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
    controller.activePlayerName = "Alex";
    controller.service = {
      resetScores: vi.fn().mockResolvedValue({
        deletedCount: 1,
      }),
    };

    await controller.handleResetClick();

    expect(controller.service.resetScores).toHaveBeenCalledWith("1234");
    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.textContent).toBe("No saved record yet for this explorer.");
    expect(controller.elements.status.textContent).toBe(
      "Every saved explorer record has been cleared.",
    );
    expect(controller.elements.status.className).toBe("top-score-status is-success");
    expect(window.localStorage.getItem("gifted-scoreboard-player-best-scores-v2")).toBeNull();
  });

  it("shows the awaiting-name state after an online reset when no explorer is active", async () => {
    await loadScoreboardScript();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("prompt", vi.fn().mockReturnValue("1234"));

    const controller = createController();
    controller.service = {
      resetScores: vi.fn().mockResolvedValue({
        deletedCount: 1,
      }),
    };

    await controller.handleResetClick();

    expect(controller.service.resetScores).toHaveBeenCalledWith("1234");
    expect(controller.elements.name.textContent).toBe("Type an explorer name");
    expect(controller.elements.score.textContent).toBe(
      "Enter the explorer name below to show only that explorer's best score.",
    );
    expect(controller.elements.status.textContent).toBe(
      "Every saved explorer record has been cleared.",
    );
  });

  it("falls back to the device-only reset flow when the backend is unavailable", async () => {
    await loadScoreboardScript();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("prompt", vi.fn().mockReturnValue("1234"));

    const controller = createController();
    controller.service = {
      resetScores: vi.fn().mockRejectedValue(new TypeError("Network down")),
    };

    await controller.handleResetClick();

    expect(controller.service.resetScores).toHaveBeenCalledWith("1234");
    expect(controller.elements.name.textContent).toBe("Type an explorer name");
    expect(controller.elements.score.textContent).toBe(
      "Enter the explorer name below to show only that explorer's best score.",
    );
    expect(controller.elements.status.textContent).toBe(
      "Every saved explorer record on this device has been cleared.",
    );
    expect(controller.elements.status.className).toBe("top-score-status is-success");
  });

  it("surfaces a reset PIN error from the backend", async () => {
    await loadScoreboardScript();
    vi.stubGlobal("confirm", vi.fn().mockReturnValue(true));
    vi.stubGlobal("prompt", vi.fn().mockReturnValue("1234"));

    const controller = createController();
    controller.service = {
      resetScores: vi.fn().mockRejectedValue({
        code: "P0001",
        message: "Wrong PIN",
      }),
    };

    await controller.handleResetClick();

    expect(controller.service.resetScores).toHaveBeenCalledWith("1234");
    expect(controller.elements.status.textContent).toBe("Wrong PIN");
    expect(controller.elements.status.className).toBe("top-score-status is-error");
  });

  it("schedules a delayed lookup and cancels it when the player name is cleared", async () => {
    await loadScoreboardScript();
    vi.useFakeTimers();

    const controller = createController();
    const refreshTopScoreForPlayer = vi
      .spyOn(controller, "refreshTopScoreForPlayer")
      .mockResolvedValue(null);

    controller.setActivePlayerName("  Alex  ");

    expect(controller.elements.name.textContent).toBe("Alex");
    expect(controller.elements.score.textContent).toBe(
      "Checking this explorer's saved record.",
    );

    await vi.advanceTimersByTimeAsync(219);
    expect(refreshTopScoreForPlayer).not.toHaveBeenCalled();

    controller.setActivePlayerName("");

    expect(controller.elements.name.textContent).toBe("Type an explorer name");
    expect(controller.elements.score.textContent).toBe(
      "Enter the explorer name below to show only that explorer's best score.",
    );
    expect(controller.elements.status.textContent).toBe("");

    await vi.advanceTimersByTimeAsync(1);
    expect(refreshTopScoreForPlayer).not.toHaveBeenCalled();
  });
});
