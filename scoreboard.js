(function () {
  const BACKEND_BASE_URL = "https://giftedntalented.onrender.com/api/v1";
  const CACHE_KEY = "gifted-scoreboard-player-best-scores-v2";
  const LEGACY_CACHE_KEYS = ["gifted-scoreboard-player-best-scores"];
  const scoreboardContent = window.CaptainNovaContent?.scoreboard || {
    awaitingName: "Type an explorer name",
    awaitingScore: "Enter the explorer name below to show only that explorer's best score.",
    loading: "Checking this explorer's saved record.",
    empty: "No saved record yet for this explorer.",
    localSaveSuccess: "Explorer record saved on this device.",
    deviceOnlyScore: "Showing a score saved only on this device.",
    deviceOnlyWarning: "Explorer record saved on this device. Online sync could not update just now.",
    privacyNote:
      "Your explorer record may stay on this device as a backup so the scoreboard can still show something if the network is unavailable. Clear this device cache removes only the local backup. It does not delete the record stored online.",
    clearDeviceCache: "Clear this device cache",
    deviceCacheCleared: "This device cache has been cleared. Your online record stays in place.",
    deviceResetSuccess: "Every saved explorer record on this device has been cleared.",
    allResetSuccess: "Every saved explorer record has been cleared.",
    resetPrompt: "Enter the admin PIN to clear saved explorer records.",
    resetConfirm: "Clear every saved explorer record on this device? This cannot be undone.",
    attemptStartWarning: "This mission can continue, but online score protection could not start right now.",
    attemptSyncWarning: "This mission can continue, but the shared explorer record could not update right now.",
  };

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

  function normalizeResetPin(pin) {
    return String(pin || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80);
  }

  function isRemoteUnavailableError(error) {
    if (!error) {
      return false;
    }

    if (error.name === "TypeError") {
      return true;
    }

    if (typeof error.status === "number" && error.status >= 500) {
      return true;
    }

    return ["SUPABASE_READ_FAILED", "SUPABASE_WRITE_FAILED", "INTERNAL_SERVER_ERROR"].includes(
      error.error || error.code,
    );
  }

  function buildFriendlyError(error) {
    if (!error) {
      return "The score board could not update online just now.";
    }

    if (error.error === "INVALID_RESET_PIN" || error.code === "P0001" || error.status === 401) {
      return error.message || "The admin PIN did not match.";
    }

    if (isRemoteUnavailableError(error)) {
      return "The explorer record could not update online just now.";
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message.trim();
    }

    return "The score board could not update online just now.";
  }

  function readCachedScoreMap() {
    try {
      LEGACY_CACHE_KEYS.forEach((legacyKey) => {
        if (legacyKey !== CACHE_KEY) {
          window.localStorage.removeItem(legacyKey);
        }
      });

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

  function normalizeElapsedSeconds(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 0) {
      return null;
    }

    return Math.round(numericValue);
  }

  function formatElapsedTime(seconds) {
    const safeSeconds = normalizeElapsedSeconds(seconds);
    if (safeSeconds === null) {
      return "";
    }

    if (safeSeconds < 60) {
      return `${safeSeconds} sec`;
    }

    const minutes = Math.floor(safeSeconds / 60);
    const remainder = safeSeconds % 60;

    if (minutes < 60) {
      return remainder === 0 ? `${minutes} min` : `${minutes}m ${remainder}s`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
  }

  class ScoreboardService {
    constructor(options) {
      this.baseUrl = options.baseUrl.replace(/\/$/, "");
    }

    headers(extraHeaders = {}) {
      return {
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
        if (response.status === 404) {
          return null;
        }

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

      return this.request(`/players/${encodeURIComponent(normalizedName)}/record`);
    }

    async saveScore(scoreEntry) {
      const normalizedName = normalizePlayerName(scoreEntry.playerName);

      return this.request(`/players/${encodeURIComponent(normalizedName)}/record`, {
        method: "POST",
        body: JSON.stringify({
          score: scoreEntry.score,
          percentage: scoreEntry.percentage,
          totalQuestions: scoreEntry.totalQuestions,
          elapsedSeconds: normalizeElapsedSeconds(scoreEntry.elapsedSeconds),
          clientType: scoreEntry.clientType || "web",
          mode: scoreEntry.mode || "quiz",
        }),
      });
    }

    async startAttempt(payload) {
      return this.request("/attempts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    async submitAttemptAnswer(attemptId, payload) {
      return this.request(`/attempts/${encodeURIComponent(attemptId)}/answers`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    async finalizeAttempt(attemptId, payload) {
      return this.request(`/attempts/${encodeURIComponent(attemptId)}/finalize`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }

    async resetScores(resetPin) {
      return this.request("/admin/scores/reset", {
        method: "POST",
        body: JSON.stringify({
          resetPin: resetPin,
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
      this.activeAttemptId = null;
      this.activeAttemptPromise = null;
      this.activeAttemptFingerprint = "";
      this.activeAttemptUnavailableFingerprint = "";
      this.activeAttemptQuestions = [];
      this.activeAttemptPlayerName = "";
      this.answerQueue = Promise.resolve();
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
        normalizeElapsedSeconds(scoreEntry.elapsedSeconds),
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
      const elapsedSeconds = normalizeElapsedSeconds(
        record.elapsed_seconds ?? record.elapsedSeconds,
      );

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
        elapsedSeconds,
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

      if (candidate.elapsedSeconds !== currentBest.elapsedSeconds) {
        if (candidate.elapsedSeconds === null) {
          return -1;
        }

        if (currentBest.elapsedSeconds === null) {
          return 1;
        }

        return currentBest.elapsedSeconds - candidate.elapsedSeconds;
      }

      return 0;
    }

    betterScore(candidate, currentBest) {
      return this.compareScoreEntries(candidate, currentBest) >= 0 ? candidate : currentBest;
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

    async clearDeviceCache() {
      this.clearCachedScores();
      this.lastSavedFingerprint = "";
      this.resetActiveAttempt();

      if (this.activePlayerName) {
        await this.refreshTopScoreForPlayer(this.activePlayerName, {
          showLoading: true,
          preserveStatus: true,
        });
      } else {
        this.renderAwaitingNameState();
      }

      this.setStatus(scoreboardContent.deviceCacheCleared, "success");
      return true;
    }

    buildAttemptFingerprint(playerName, questions) {
      return JSON.stringify([
        normalizePlayerName(playerName),
        questions.map((question) => [question.questionId, question.bankId, ...(question.options || [])]),
      ]);
    }

    resetActiveAttempt() {
      this.activeAttemptId = null;
      this.activeAttemptPromise = null;
      this.activeAttemptFingerprint = "";
      this.activeAttemptUnavailableFingerprint = "";
      this.activeAttemptQuestions = [];
      this.activeAttemptPlayerName = "";
      this.answerQueue = Promise.resolve();
    }

    async beginAttempt({ playerName, clientType = "web", mode = "quiz", questions = [] }) {
      const normalizedName = normalizePlayerName(playerName);
      if (!normalizedName || mode === "story") {
        this.resetActiveAttempt();
        return null;
      }

      const fingerprint = this.buildAttemptFingerprint(normalizedName, questions);
      if (this.activeAttemptId && this.activeAttemptFingerprint === fingerprint) {
        return {
          attemptId: this.activeAttemptId,
          questions: this.activeAttemptQuestions,
        };
      }

      if (this.activeAttemptPromise && this.activeAttemptFingerprint === fingerprint) {
        return this.activeAttemptPromise;
      }

      if (this.activeAttemptUnavailableFingerprint === fingerprint) {
        return null;
      }

      this.activeAttemptId = null;
      this.activeAttemptPlayerName = normalizedName;
      this.activeAttemptFingerprint = fingerprint;
      this.activeAttemptPromise = this.service
        .startAttempt({
          playerName: normalizedName,
          clientType,
          mode,
          questions,
        })
        .then((result) => {
          this.activeAttemptId = result?.attemptId || null;
          this.activeAttemptQuestions = Array.isArray(result?.questions) ? result.questions : [];
          this.activeAttemptUnavailableFingerprint = "";
          return result || null;
        })
        .catch((error) => {
          this.activeAttemptId = null;
          this.activeAttemptQuestions = [];
          this.activeAttemptUnavailableFingerprint = fingerprint;
          this.setStatus(scoreboardContent.attemptStartWarning, "info", true);
          return null;
        })
        .finally(() => {
          this.activeAttemptPromise = null;
        });

      return this.activeAttemptPromise;
    }

    async ensureActiveAttempt(options) {
      if (this.activeAttemptId) {
        return this.activeAttemptId;
      }

      if (this.activeAttemptPromise) {
        const attemptResult = await this.activeAttemptPromise;
        return attemptResult?.attemptId || null;
      }

      const attemptResult = await this.beginAttempt(options);
      return attemptResult?.attemptId || null;
    }

    async recordValidatedAnswer({
      playerName,
      clientType = "web",
      mode = "quiz",
      sessionQuestions = [],
      questionId,
      bankId,
      selectedAnswer,
      elapsedSeconds,
    }) {
      if (mode === "story") {
        return null;
      }

      this.answerQueue = this.answerQueue
        .catch(() => undefined)
        .then(async () => {
          const attemptId = await this.ensureActiveAttempt({
            playerName,
            clientType,
            mode,
            questions: sessionQuestions,
          });

          if (!attemptId) {
            return null;
          }

          try {
            const result = await this.service.submitAttemptAnswer(attemptId, {
              questionId,
              bankId,
              selectedAnswer,
              elapsedSeconds: normalizeElapsedSeconds(elapsedSeconds),
            });

            if (result?.record) {
              this.renderTopScore(result.record, playerName);
              this.clearStatus();
            }

            return result;
          } catch (error) {
            this.setStatus(scoreboardContent.attemptSyncWarning, "info", true);
            return null;
          }
        });

      return this.answerQueue;
    }

    async finalizeAttempt({ elapsedSeconds }) {
      await this.answerQueue.catch(() => undefined);
      const inFlightAttempt = this.activeAttemptPromise ? await this.activeAttemptPromise : null;
      const attemptId = this.activeAttemptId || inFlightAttempt?.attemptId || null;
      if (!attemptId) {
        return null;
      }

      try {
        const result = await this.service.finalizeAttempt(attemptId, {
          elapsedSeconds: normalizeElapsedSeconds(elapsedSeconds),
        });

        if (result?.record) {
          this.renderTopScore(result.record, this.activeAttemptPlayerName);
          this.clearStatus();
        }

        return result;
      } catch (error) {
        this.setStatus(scoreboardContent.attemptSyncWarning, "info", true);
        return null;
      }
    }

    async authorizeReset() {
      const resetPin = window.prompt(scoreboardContent.resetPrompt);
      if (resetPin === null) {
        return null;
      }

      const normalizedPin = normalizeResetPin(resetPin);
      if (!normalizedPin) {
        this.setStatus("Please enter the admin PIN.", "error", true);
        return null;
      }

      return normalizedPin;
    }

    renderAwaitingNameState() {
      this.elements.name.textContent = scoreboardContent.awaitingName;
      this.elements.score.textContent = scoreboardContent.awaitingScore;
    }

    renderLoadingState(playerName) {
      this.elements.name.textContent = playerName;
      this.elements.score.textContent = scoreboardContent.loading;
    }

    renderNoScoreState(playerName) {
      this.elements.name.textContent = playerName;
      this.elements.score.textContent = scoreboardContent.empty;
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
      const metaBits = [
        `<span>${escapeHtml(`${topScore.score}/${topScore.totalQuestions}`)}</span>`,
        `<span>${escapeHtml(`${topScore.percentage}%`)}</span>`,
      ];

      if (topScore.elapsedSeconds !== null) {
        metaBits.push(`<span>${escapeHtml(formatElapsedTime(topScore.elapsedSeconds))}</span>`);
      }

      this.elements.score.innerHTML = `
        ${metaBits.join("")}
      `;
      this.cachePlayerScore(topScore);
    }

    async refreshTopScoreForPlayer(playerName, options = {}) {
      const normalizedName = normalizePlayerName(playerName);
      const requestToken = ++this.lookupToken;
      let shouldPreserveStatus = Boolean(options.preserveStatus);
      const cachedScore = this.getCachedPlayerScore(normalizedName);

      if (!normalizedName) {
        this.activePlayerName = "";
        this.renderAwaitingNameState();
        if (!shouldPreserveStatus) {
          this.clearStatus();
        }
        return null;
      }

      this.activePlayerName = normalizedName;
      if (options.showLoading !== false) {
        this.renderLoadingState(normalizedName);
      } else {
        this.renderNoScoreState(normalizedName);
      }

      try {
        const record = await this.service.fetchPlayerTopScore(normalizedName);

        if (requestToken !== this.lookupToken || this.activePlayerName !== normalizedName) {
          return null;
        }

        const remoteScore = this.normalizeTopScore(record, normalizedName);

        if (!remoteScore) {
          if (cachedScore) {
            this.renderTopScore(cachedScore, normalizedName);
            shouldPreserveStatus = true;
            this.setStatus(scoreboardContent.deviceOnlyScore, "info", true);
          } else {
            this.renderNoScoreState(normalizedName);
          }
          if (!shouldPreserveStatus) {
            this.clearStatus();
          }
          return null;
        }

        this.renderTopScore(remoteScore, normalizedName);
        if (!shouldPreserveStatus) {
          this.clearStatus();
        }
        return remoteScore;
      } catch (error) {
        if (requestToken !== this.lookupToken || this.activePlayerName !== normalizedName) {
          return null;
        }

        if (cachedScore) {
          this.renderTopScore(cachedScore, normalizedName);
          this.setStatus(scoreboardContent.deviceOnlyScore, "info", true);
        } else {
          this.renderNoScoreState(normalizedName);
          if (!isRemoteUnavailableError(error)) {
            this.setStatus(buildFriendlyError(error), "info", true);
          }
        }
        return cachedScore;
      }
    }

    setActivePlayerName(playerName) {
      const normalizedName = normalizePlayerName(playerName);
      window.clearTimeout(this.lookupDelayId);
      this.resetActiveAttempt();

      if (!normalizedName) {
        this.lookupToken += 1;
        this.activePlayerName = "";
        this.renderAwaitingNameState();
        this.clearStatus();
        return;
      }

      this.activePlayerName = normalizedName;
      this.renderLoadingState(normalizedName);
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
      this.cachePlayerScore(normalizedEntry);

      if (this.activePlayerName === playerName) {
        this.renderTopScore(normalizedEntry, playerName);
      }

      try {
        await this.service.saveScore({
          ...normalizedEntry,
          clientType: scoreEntry.clientType || "web",
          mode: scoreEntry.mode || "quiz",
        });
        await this.refreshTopScoreForPlayer(playerName, {
          preserveStatus: true,
          showLoading: false,
        });

        if (options.showSuccessMessage) {
          this.setStatus(scoreboardContent.localSaveSuccess, "success");
        }

        return true;
      } catch (error) {
        this.setStatus(scoreboardContent.deviceOnlyWarning, "info", true);

        return true;
      }
    }

    async handleResetClick() {
      const shouldReset = window.confirm(scoreboardContent.resetConfirm);

      if (!shouldReset) {
        return;
      }

      const resetPin = await this.authorizeReset();
      if (!resetPin) {
        return;
      }

      this.setBusy(true);

      try {
        let resetMode = "local";

        try {
          await this.service.resetScores(resetPin);
          resetMode = "online";
        } catch (error) {
          if (isRemoteUnavailableError(error)) {
            resetMode = "local";
          } else {
            this.setStatus(
              buildFriendlyError(error),
              error && error.code === "P0001" ? "error" : "info",
              true,
            );
            return;
          }
        }

        this.lastSavedFingerprint = "";
        this.clearCachedScores();
        this.resetActiveAttempt();

        if (this.activePlayerName) {
          this.renderNoScoreState(this.activePlayerName);
        } else {
          this.renderAwaitingNameState();
        }

        this.setStatus(
          resetMode === "online"
            ? scoreboardContent.allResetSuccess
            : scoreboardContent.deviceResetSuccess,
          "success",
        );
      } finally {
        this.setBusy(false);
      }
    }
  }

  function createScoreboardController(options) {
    return new ScoreboardController({
      service: new ScoreboardService({
        baseUrl: BACKEND_BASE_URL,
      }),
      elements: options.elements,
    });
  }

  window.GiftedScoreboard = Object.freeze({
    createScoreboardController,
  });
})();
