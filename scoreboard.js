(function () {
  const SUPABASE_URL = "https://hwafspusaijqjkgweptv.supabase.co";
  const SUPABASE_ANON_KEY = "sb_publishable_-hPDn_wxDliucO3L5pP7-Q_Cd8MBvy-";
  const CACHE_KEY = "gifted-scoreboard-player-best-scores";

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

  function playerCacheKey(name) {
    return normalizePlayerName(name).toLowerCase();
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

  function readCachedScoreMap() {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeCachedScoreMap(scoreMap) {
    try {
      const safeScoreMap = scoreMap && typeof scoreMap === "object" ? scoreMap : {};
      if (Object.keys(safeScoreMap).length === 0) {
        window.localStorage.removeItem(CACHE_KEY);
        return;
      }

      window.localStorage.setItem(CACHE_KEY, JSON.stringify(safeScoreMap));
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

    async fetchPlayerTopScore(playerName) {
      const normalizedName = normalizePlayerName(playerName);
      if (!normalizedName) {
        return null;
      }

      const payload = await this.request("/rest/v1/rpc/get_player_top_score", {
        method: "POST",
        body: JSON.stringify({
          target_player_name: normalizedName,
        }),
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
      this.lookupDelayId = null;
      this.lookupToken = 0;
      this.lastSavedFingerprint = "";
      this.activePlayerName = "";
      this.cachedScoreMap = readCachedScoreMap();
      this.boundReset = this.handleResetClick.bind(this);
    }

    init() {
      this.renderAwaitingNameState();
      this.elements.resetButton.addEventListener("click", this.boundReset);
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

    normalizeTopScore(record, fallbackPlayerName = "") {
      if (!record) {
        return null;
      }

      const playerName = normalizePlayerName(record.player_name || record.playerName || fallbackPlayerName);
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

    compareScoreEntries(candidate, currentBest) {
      if (!candidate) {
        return -1;
      }

      if (!currentBest) {
        return 1;
      }

      if (candidate.score !== currentBest.score) {
        return candidate.score - currentBest.score;
      }

      if (candidate.percentage !== currentBest.percentage) {
        return candidate.percentage - currentBest.percentage;
      }

      return 0;
    }

    getCachedPlayerScore(playerName) {
      const key = playerCacheKey(playerName);
      if (!key) {
        return null;
      }

      return this.normalizeTopScore(this.cachedScoreMap[key], playerName);
    }

    cachePlayerScore(record) {
      const normalized = this.normalizeTopScore(record);
      if (!normalized) {
        return null;
      }

      this.cachedScoreMap[playerCacheKey(normalized.playerName)] = normalized;
      writeCachedScoreMap(this.cachedScoreMap);
      return normalized;
    }

    clearCachedScores() {
      this.cachedScoreMap = {};
      writeCachedScoreMap({});
    }

    renderAwaitingNameState() {
      this.elements.name.textContent = "Type a child name";
      this.elements.score.textContent = "Enter the name below to show only that child's best score.";
    }

    renderLoadingState(playerName) {
      this.elements.name.textContent = playerName;
      this.elements.score.textContent = "Checking this child's saved best score.";
    }

    renderNoScoreState(playerName) {
      this.elements.name.textContent = playerName;
      this.elements.score.textContent = "No saved score yet for this child.";
    }

    renderTopScore(record, fallbackPlayerName = "") {
      const topScore = this.normalizeTopScore(record, fallbackPlayerName);
      if (!topScore) {
        if (fallbackPlayerName) {
          this.renderNoScoreState(fallbackPlayerName);
        } else {
          this.renderAwaitingNameState();
        }
        return;
      }

      this.elements.name.textContent = topScore.playerName;
      this.elements.score.innerHTML = `
        <span>${escapeHtml(`${topScore.score}/${topScore.totalQuestions}`)}</span>
        <span>${escapeHtml(`${topScore.percentage}%`)}</span>
      `;
      this.cachePlayerScore(topScore);
    }

    async refreshTopScoreForPlayer(playerName, options = {}) {
      const normalizedName = normalizePlayerName(playerName);
      const requestToken = ++this.lookupToken;

      if (!normalizedName) {
        this.activePlayerName = "";
        this.renderAwaitingNameState();
        if (!options.preserveStatus) {
          this.clearStatus();
        }
        return null;
      }

      this.activePlayerName = normalizedName;

      const cachedScore = this.getCachedPlayerScore(normalizedName);
      if (cachedScore) {
        this.renderTopScore(cachedScore, normalizedName);
      } else if (options.showLoading !== false) {
        this.renderLoadingState(normalizedName);
      } else {
        this.renderNoScoreState(normalizedName);
      }

      try {
        const record = await this.service.fetchPlayerTopScore(normalizedName);

        if (requestToken !== this.lookupToken || this.activePlayerName !== normalizedName) {
          return null;
        }

        if (!record) {
          this.renderNoScoreState(normalizedName);
          if (!options.preserveStatus) {
            this.clearStatus();
          }
          return null;
        }

        this.renderTopScore(record, normalizedName);
        if (!options.preserveStatus) {
          this.clearStatus();
        }
        return record;
      } catch (error) {
        if (requestToken !== this.lookupToken || this.activePlayerName !== normalizedName) {
          return null;
        }

        if (!cachedScore) {
          this.renderNoScoreState(normalizedName);
        }

        this.setStatus(buildFriendlyError(error), "info", true);
        return cachedScore;
      }
    }

    setActivePlayerName(playerName) {
      const normalizedName = normalizePlayerName(playerName);
      window.clearTimeout(this.lookupDelayId);

      if (!normalizedName) {
        this.lookupToken += 1;
        this.activePlayerName = "";
        this.renderAwaitingNameState();
        this.clearStatus();
        return;
      }

      this.activePlayerName = normalizedName;
      const cachedScore = this.getCachedPlayerScore(normalizedName);
      if (cachedScore) {
        this.renderTopScore(cachedScore, normalizedName);
      } else {
        this.renderLoadingState(normalizedName);
      }
      this.clearStatus();

      this.lookupDelayId = window.setTimeout(() => {
        this.refreshTopScoreForPlayer(normalizedName);
      }, 220);
    }

    async recordScore(scoreEntry, options = {}) {
      const playerName = normalizePlayerName(scoreEntry.playerName);
      if (!playerName) {
        return null;
      }

      const normalizedEntry = this.normalizeTopScore({
        ...scoreEntry,
        playerName,
      });

      if (!normalizedEntry) {
        return null;
      }

      if (normalizedEntry.score <= 0) {
        return null;
      }

      const currentBest = this.getCachedPlayerScore(playerName);
      if (this.compareScoreEntries(normalizedEntry, currentBest) <= 0) {
        if (this.activePlayerName === playerName && currentBest) {
          this.renderTopScore(currentBest, playerName);
        }
        return null;
      }

      const fingerprint = this.resultFingerprint(normalizedEntry);
      if (fingerprint === this.lastSavedFingerprint) {
        if (this.activePlayerName === playerName) {
          this.renderTopScore(normalizedEntry, playerName);
        }
        return null;
      }

      this.lastSavedFingerprint = fingerprint;

      try {
        await this.service.saveScore(normalizedEntry);
        this.cachePlayerScore(normalizedEntry);

        if (this.activePlayerName === playerName) {
          this.renderTopScore(normalizedEntry, playerName);
        }

        await this.refreshTopScoreForPlayer(playerName, {
          preserveStatus: true,
          showLoading: false,
        });

        if (options.showSuccessMessage) {
          this.setStatus("Best score saved for this child.", "success");
        }

        return true;
      } catch (error) {
        this.lastSavedFingerprint = "";
        if (this.activePlayerName === playerName && currentBest) {
          this.renderTopScore(currentBest, playerName);
        }
        this.setStatus(buildFriendlyError(error), "info", true);
        return false;
      }
    }

    async handleResetClick() {
      const shouldReset = window.confirm(
        "Clear every saved score for every child? This cannot be undone.",
      );

      if (!shouldReset) {
        return;
      }

      const resetPin = window.prompt("Enter the admin PIN to clear the score board for every child.");
      if (resetPin === null) {
        return;
      }

      this.setBusy(true);

      try {
        await this.service.resetScores(resetPin);
        this.lastSavedFingerprint = "";
        this.clearCachedScores();

        if (this.activePlayerName) {
          this.renderNoScoreState(this.activePlayerName);
        } else {
          this.renderAwaitingNameState();
        }

        this.setStatus("Every saved score has been cleared.", "success");
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
