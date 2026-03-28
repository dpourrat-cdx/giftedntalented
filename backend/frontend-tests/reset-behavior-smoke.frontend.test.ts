// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { importBrowserScript, loadIndexHtml, resetBrowserGlobals } from "./helpers/browser-script";

const scoreboardCacheKey = "gifted-scoreboard-player-best-scores-v2";

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

describe("reset behavior smoke", () => {
  beforeEach(() => {
    vi.resetModules();
    resetBrowserGlobals();
    vi.restoreAllMocks();
  });

  it("clears cached records and resets the leaderboard card", async () => {
    const fetchMock = vi.spyOn(window, "fetch").mockResolvedValueOnce(
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
    ).mockResolvedValueOnce(
      new Response(null, {
        status: 204,
      }),
    );

    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);
    const promptMock = vi.spyOn(window, "prompt").mockReturnValue(" 1234 ");

    const controller = await createScoreboardController();
    await controller.refreshTopScoreForPlayer("Alex", { showLoading: false });

    expect(document.getElementById("leaderboardName")?.textContent).toBe("Alex");
    expect(window.localStorage.getItem(scoreboardCacheKey)).not.toBeNull();

    await controller.handleResetClick();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://giftedntalented.onrender.com/api/v1/admin/scores/reset",
    );
    expect(window.localStorage.getItem(scoreboardCacheKey)).toBeNull();
    expect(document.getElementById("leaderboardName")?.textContent).toBe("Alex");
    expect(document.getElementById("leaderboardScore")?.textContent).toBe(
      "No saved record yet for this explorer.",
    );
    expect(document.getElementById("leaderboardStatus")?.textContent).toBe(
      "Every saved explorer record has been cleared.",
    );
    expect((document.getElementById("resetScoresButton") as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the admin PIN validation message when the prompt is left blank", async () => {
    const fetchMock = vi.spyOn(window, "fetch");
    const confirmMock = vi.spyOn(window, "confirm").mockReturnValue(true);
    const promptMock = vi.spyOn(window, "prompt").mockReturnValue("   ");

    const controller = await createScoreboardController();
    await controller.handleResetClick();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(promptMock).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem(scoreboardCacheKey)).toBeNull();
    expect(document.getElementById("leaderboardStatus")?.textContent).toBe(
      "Please enter the admin PIN.",
    );
    expect((document.getElementById("resetScoresButton") as HTMLButtonElement).disabled).toBe(false);
  });
});
