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
    resetBrowserGlobals();
    vi.restoreAllMocks();
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
});
