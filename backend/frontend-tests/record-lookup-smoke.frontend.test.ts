// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { importBrowserScript, loadIndexHtml, resetBrowserGlobals } from "./helpers/browser-script";

async function createScoreboardController() {
  await loadIndexHtml();
  await importBrowserScript("content.js");
  await importBrowserScript("scoreboard.js");

  const controller = window.GiftedScoreboard.createScoreboardController({
    elements: {
      name: document.getElementById("leaderboardName"),
      score: document.getElementById("leaderboardScore"),
      status: document.getElementById("leaderboardStatus"),
      resetButton: document.getElementById("resetScoresButton"),
    },
  });

  controller.init();
  return controller;
}

describe("record lookup smoke", () => {
  beforeEach(() => {
    vi.resetModules();
    resetBrowserGlobals();
    vi.restoreAllMocks();
  });

  it("shows the loading copy while an explorer lookup is pending", async () => {
    let resolveFetch;
    const fetchPromise = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const fetchMock = vi.spyOn(window, "fetch").mockReturnValue(fetchPromise);

    const controller = await createScoreboardController();
    controller.setActivePlayerName("Alex");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(document.getElementById("leaderboardName")?.textContent).toBe("Alex");
    expect(document.getElementById("leaderboardScore")?.textContent).toBe(
      "Checking this explorer's saved record.",
    );

    await new Promise((resolve) => window.setTimeout(resolve, 250));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(
      new Response(
        JSON.stringify({
          player_name: "Alex",
          score: 4,
          total_questions: 64,
          percentage: 6,
          elapsed_seconds: 125,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    await fetchPromise;
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });

  it("renders a fetched explorer record in the leaderboard card", async () => {
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          player_name: "Alex",
          score: 4,
          total_questions: 64,
          percentage: 6,
          elapsed_seconds: 125,
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const controller = await createScoreboardController();
    await controller.refreshTopScoreForPlayer("  Alex  ", { showLoading: false });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://giftedntalented.onrender.com/api/v1/players/Alex/record",
    );

    const scoreBits = Array.from(
      document.querySelectorAll("#leaderboardScore span"),
      (span) => span.textContent ?? "",
    );

    expect(document.getElementById("leaderboardName")?.textContent).toBe("Alex");
    expect(scoreBits).toEqual(["4/64", "6%", "2m 5s"]);
  });

  it("falls back to a cached explorer record when the remote lookup is unavailable", async () => {
    window.localStorage.setItem(
      "gifted-scoreboard-player-best-scores-v2",
      JSON.stringify({
        alex: {
          playerName: "Alex",
          score: 5,
          totalQuestions: 64,
          percentage: 8,
          elapsedSeconds: 120,
        },
      }),
    );

    vi.spyOn(window, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "SUPABASE_READ_FAILED",
          message: "Temporarily unavailable.",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const controller = await createScoreboardController();
    await controller.refreshTopScoreForPlayer("Alex", {
      preserveStatus: true,
      showLoading: false,
    });

    const scoreBits = Array.from(
      document.querySelectorAll("#leaderboardScore span"),
      (span) => span.textContent ?? "",
    );

    expect(document.getElementById("leaderboardName")?.textContent).toBe("Alex");
    expect(scoreBits).toEqual(["5/64", "8%", "2 min"]);
  });
});
