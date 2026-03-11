(function () {
  const SUPABASE_URL = "https://hwafspusaijqjkgweptv.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_-hPDn_wxDliucO3L5pP7-Q_Cd8MBvy-";
  const CACHE_KEY = "gifted-scoreboard-top-score";

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizePlayerName(name) {
    return String(name || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 40);
  }

  function buildFriendlyError(error) {
    if (!error) {
      return "The score board could not update just now.";
    }

    if (error.code === "PGRST205" || error.code === "PGRST202") {
      return "The score board needs its Supabase setup script before it can save scores.";
    }

    if (error.code === "42501") {
      return "Supabase still needs one more permission step for the score board.";
    }

    if (error.code === "P0001") {
      return error.message || "That admin PIN did not match.";
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message.trim();
    }

    return "The score board could not update just now.";
  }

  function readCachedTopScore() {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeCachedTopScore(record) {
    try {
      if (!record) {
        window.localStorage.removeItem(CACHE_KEY);
        return;
      }

      window.localStorage.setItem(CACHE_KEY, JSON.stringify(record));
    } catch (error) {
      // Ignore storage failures so the scoreboard still works without local persistence.
    }
  }

  class ScoreboardService {
    constructor(options) {
      this.baseUrl = options.baseUrl.replace(/\/$/, "");
      this.apiKey = options.apiKey;
    }

    headers(extraHeaders = {}) {
      return {
        apikey: this.apiKey,
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      };
    }

    async request(path, options = {}) {
      const response = await window.fetch(`${this.baseUrl}${path}`, {
        method: options.method || "GET",
        headers: this.headers(options.headers),
        body: options.body,
      });

      if (!response.ok) {
        let details = null;

        try {
          details = await response.json();
        } catch (error) {
          details = {
            message: response.statusText || "Unexpected Supabase error.",
          };
        }

        throw {
          status: response.status,
          ...details,
        };
      }

      if (response.status === 204) {
        return null;
      }

      const text = await response.text();
      return text ? JSON.parse(text) : null;
    }

    async fetchTopScore() {
      const payload = await this.request("/rest/v1/rpc/get_top_score", {
        method: "POST",
        body: JSON.stringify({}),
      });

      if (Array.isArray(payload)) {
        return payload[0] || null;
      }

      return payload || null;
    }

    async saveScore(scoreEntry) {
      return this.request("/rest/v1/test_scores", {
        method: "POST",
        headers: {
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          player_name: normalizePlayerName(scoreEntry.playerName),
          score: scoreEntry.score,
          percentage: scoreEntry.percentage,
          total_questions: scoreEntry.totalQuestions,
        }),
      });
    }

    async resetScores(resetPin) {
      return this.request("/rest/v1/rpc/reset_scores", {
        method: "POST",
        body: JSON.stringify({
          reset_pin: resetPin,
        }),
      });
    }
  }

  class ScoreboardController {
    constructor(options) {
      this.service = options.service;
      this.elements = options.elements;
      this.statusTimeoutId = null;
      this.lastSavedFingerprint = "";
      this.boundReset = this.handleResetClick.bind(this);
    }

    init() {
      const cachedScore = readCachedTopScore();
      if (cachedScore) {
        this.renderTopScore(cachedScore);
      } else {
        this.renderEmptyState();
      }

      this.elements.resetButton.addEventListener("click", this.boundReset);
      return this.refreshTopScore();
    }

    resultFingerprint(scoreEntry) {
      return JSON.stringify([
        normalizePlayerName(scoreEntry.playerName),
        scoreEntry.score,
        scoreEntry.percentage,
        scoreEntry.totalQuestions,
      ]);
    }

    setStatus(message, tone = "info", persist = false) {
      window.clearTimeout(this.statusTimeoutId);
      this.elements.status.textContent = message;
      this.elements.status.className = `top-score-status is-${tone}`;

      if (persist) {
        return;
      }

      this.statusTimeoutId = window.setTimeout(() => {
        this.clearStatus();
      }, 4500);
    }

    clearStatus() {
      window.clearTimeout(this.statusTimeoutId);
      this.elements.status.textContent = "";
      this.elements.status.className = "top-score-status is-hidden";
    }

    setBusy(isBusy) {
      this.elements.resetButton.disabled = isBusy;
      this.elements.resetButton.setAttribute("aria-busy", String(isBusy));
    }

    normalizeTopScore(record) {
      if (!record) {
        return null;
      }

      const playerName = normalizePlayerName(record.player_name || record.playerName);
      const score = Number(record.score);
      const totalQuestions = Number(record.total_questions || record.totalQuestions);
      const percentage = Number(record.percentage);

      if (!playerName || !Number.isFinite(score) || !Number.isFinite(totalQuestions)) {
        return null;
      }

      return {
        playerName,
        score,
        totalQuestions,
        percentage: Number.isFinite(percentage)
          ? percentage
          : totalQuestions > 0
            ? Math.round((score / totalQuestions) * 100)
            : 0,
      };
    }

    renderEmptyState() {
      writeCachedTopScore(null);
      this.elements.name.textContent = "Be the first player";
      this.elements.score.textContent = "Finish a test to set the first top score.";
    }

    renderTopScore(record) {
      const topScore = this.normalizeTopScore(record);
      if (!topScore) {
        this.renderEmptyState();
        writeCachedTopScore(null);
        return;
      }

      this.elements.name.textContent = topScore.playerName;
      this.elements.score.innerHTML = `
        <span>${escapeHtml(`${topScore.score}/${topScore.totalQuestions}`)}</span>
        <span>${escapeHtml(`${topScore.percentage}%`)}</span>
      `;
      writeCachedTopScore(topScore);
    }

    async refreshTopScore() {
      try {
        const record = await this.service.fetchTopScore();

        if (!record) {
          this.renderEmptyState();
          this.clearStatus();
          return null;
        }

        this.renderTopScore(record);
        this.clearStatus();
        return record;
      } catch (error) {
        const cachedScore = readCachedTopScore();
        if (!cachedScore) {
          this.renderEmptyState();
        }

        this.setStatus(buildFriendlyError(error), "info", true);
        return null;
      }
    }

    async recordScore(scoreEntry) {
      const playerName = normalizePlayerName(scoreEntry.playerName);
      if (!playerName) {
        return null;
      }

      const fingerprint = this.resultFingerprint({
        ...scoreEntry,
        playerName,
      });

      if (fingerprint === this.lastSavedFingerprint) {
        return null;
      }

      this.lastSavedFingerprint = fingerprint;

      try {
        await this.service.saveScore({
          ...scoreEntry,
          playerName,
        });
        await this.refreshTopScore();
        this.setStatus("Score saved to the leader board.", "success");
        return true;
      } catch (error) {
        this.lastSavedFingerprint = "";
        this.setStatus(buildFriendlyError(error), "info", true);
        return false;
      }
    }

    async handleResetClick() {
      const shouldReset = window.confirm(
        "Clear every saved score from the leader board? This cannot be undone.",
      );

      if (!shouldReset) {
        return;
      }

      const resetPin = window.prompt("Enter the admin PIN to clear the leader board.");
      if (resetPin === null) {
        return;
      }

      this.setBusy(true);

      try {
        await this.service.resetScores(resetPin);
        this.lastSavedFingerprint = "";
        this.renderEmptyState();
        this.setStatus("The leader board has been cleared.", "success");
      } catch (error) {
        this.setStatus(buildFriendlyError(error), "info", true);
      } finally {
        this.setBusy(false);
      }
    }
  }

  function createScoreboardController(options) {
    return new ScoreboardController({
      service: new ScoreboardService({
        baseUrl: SUPABASE_URL,
        apiKey: SUPABASE_ANON_KEY,
      }),
      elements: options.elements,
    });
  }

  window.GiftedScoreboard = Object.freeze({
    createScoreboardController,
  });
})();
