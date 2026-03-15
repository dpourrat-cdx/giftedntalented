(function () {
  const content = window.CaptainNovaContent || null;

  const GAME_THEMES = {
    rocketAdventure: {
      id: "rocket-adventure",
      missionLabel: "Mission",
      adventureLabel: "Adventure",
      rewardStages: [
        { key: "base", label: "rocket base" },
        { key: "body", label: "rocket body" },
        { key: "window", label: "rocket window" },
        { key: "wings", label: "rocket wings" },
        { key: "engine", label: "rocket engine" },
        { key: "astronaut", label: "astronaut seat" },
        { key: "flames", label: "launch flames" },
        { key: "launch", label: "launch glow" },
      ],
      messages: content?.gamification?.messages || {
        correct: ["Rocket power rising!", "Mission Control says yes!"],
        gentle: ["Almost there, explorer!", "The next rocket step is waiting!"],
        midpoint: ["Star boost unlocked!", "Halfway through this mission!"],
        sectionComplete: ["Rocket part unlocked!", "Mission complete!"],
        final: ["Countdown complete!", "The rocket is ready to launch!"],
      },
    },
  };

  function prefersReducedMotion() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatTemplate(template, values) {
    return String(template || "").replace(/\{(\w+)\}/g, (match, key) => {
      return Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match;
    });
  }

  function celebrationBodyHtml(text) {
    const sentences = String(text || "")
      .trim()
      .split(/(?<=[.!?])\s+/u)
      .filter(Boolean);

    if (sentences.length === 0) {
      return "";
    }

    const paragraphs = [];
    for (let index = 0; index < sentences.length; index += 2) {
      const paragraph = sentences.slice(index, index + 2).join(" ");
      paragraphs.push(`<p>${escapeHtml(paragraph)}</p>`);
    }

    return `<div class="celebration-body">${paragraphs.join("")}</div>`;
  }

  function storyMissionForSection(sectionKey) {
    return content?.story?.missions?.find((mission) => mission.section === sectionKey) || null;
  }

  function sectionStateFromSnapshot(snapshot, section, sectionIndex) {
    const questions = snapshot.sessionQuestions
      .filter((question) => question.section === section)
      .map((question, questionIndex) => {
        const isAnswered = snapshot.validatedAnswers[question.id - 1] !== null;
        const isCurrent = snapshot.hasStarted && snapshot.currentIndex === question.id - 1;

        return {
          id: question.id,
          questionIndex,
          isAnswered,
          isCurrent,
        };
      });

    const answeredCount = questions.filter((question) => question.isAnswered).length;
    const currentQuestionIndex = questions.findIndex((question) => question.isCurrent);

    return {
      key: section,
      label: section,
      index: sectionIndex,
      totalQuestions: questions.length,
      answeredCount,
      midpointReached: answeredCount >= Math.ceil(questions.length / 2),
      isCompleted: answeredCount === questions.length && questions.length > 0,
      questions,
      currentQuestionIndex: currentQuestionIndex === -1 ? 0 : currentQuestionIndex,
    };
  }

  function buildGamificationState(snapshot, theme) {
    const totalQuestions = snapshot.sessionQuestions.length;
    const answeredTotal = snapshot.validatedAnswers.filter((answer) => answer !== null).length;
    const sectionStates = snapshot.sections.map((section, index) =>
      sectionStateFromSnapshot(snapshot, section, index),
    );
    const completedSections = sectionStates.filter((section) => section.isCompleted).length;
    const midpointBoosts = sectionStates.filter((section) => section.midpointReached).length;
    const currentQuestion = snapshot.hasStarted ? snapshot.sessionQuestions[snapshot.currentIndex] : null;
    const currentSectionIndex = currentQuestion
      ? snapshot.sections.indexOf(currentQuestion.section)
      : 0;
    const currentSection = sectionStates[currentSectionIndex] || sectionStates[0] || null;
    const currentQuestionNumber = currentSection
      ? currentSection.currentQuestionIndex + 1
      : 1;

    return {
      theme,
      hasStarted: snapshot.hasStarted,
      isSubmitted: snapshot.isSubmitted,
      playerName: snapshot.playerName,
      sections: sectionStates,
      totalSections: snapshot.sections.length,
      totalQuestions,
      answeredTotal,
      completedSections,
      midpointBoosts,
      overallPercent: totalQuestions === 0 ? 0 : Math.round((answeredTotal / totalQuestions) * 100),
      currentSectionIndex,
      currentSection,
      currentQuestionNumber,
      allQuestionsAnswered: totalQuestions > 0 && answeredTotal === totalQuestions,
    };
  }

  function renderRocketScene(stageCount, boostCount, isLaunching) {
    const stars = Array.from({ length: clamp(boostCount, 0, 8) }, (_, index) => {
      return `<span class="rocket-star rocket-star-${index + 1}"></span>`;
    }).join("");

    const partClass = (unlocked) => (unlocked ? "is-unlocked" : "");

    return `
      <div class="rocket-scene ${isLaunching ? "is-launching" : ""}">
        <div class="rocket-stars" aria-hidden="true">${stars}</div>
        <div class="rocket-fuel">
          <span class="rocket-fuel-fill" style="height: ${Math.round((clamp(boostCount, 0, 8) / 8) * 100)}%"></span>
        </div>
        <div class="rocket-pad rocket-part ${partClass(stageCount >= 1)}"></div>
        <div class="rocket-body rocket-part ${partClass(stageCount >= 2)}"></div>
        <div class="rocket-window rocket-part ${partClass(stageCount >= 3)}"></div>
        <div class="rocket-wing rocket-wing-left rocket-part ${partClass(stageCount >= 4)}"></div>
        <div class="rocket-wing rocket-wing-right rocket-part ${partClass(stageCount >= 4)}"></div>
        <div class="rocket-engine rocket-part ${partClass(stageCount >= 5)}"></div>
        <div class="rocket-astronaut rocket-part ${partClass(stageCount >= 6)}"></div>
        <div class="rocket-flames rocket-part ${partClass(stageCount >= 7)}"></div>
      </div>
    `;
  }

  function missionRewardIconSvg(key) {
    const icons = {
      base: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <rect x="11" y="24" width="26" height="8" rx="3"></rect>
          <path d="M16 32v5M32 32v5M8 39h32"></path>
        </svg>
      `,
      body: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 8c6 4 10 11 10 19v8H14v-8c0-8 4-15 10-19Z"></path>
          <path d="M18 35h12"></path>
        </svg>
      `,
      window: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 9c6 4 10 11 10 18v8H14v-8c0-7 4-14 10-18Z"></path>
          <circle cx="24" cy="23" r="5"></circle>
        </svg>
      `,
      wings: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 8c5 4 8 10 8 17v10H16V25c0-7 3-13 8-17Z"></path>
          <path d="M16 28l-7 5 7 2M32 28l7 5-7 2"></path>
        </svg>
      `,
      engine: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 8c5 4 8 10 8 17v6H16v-6c0-7 3-13 8-17Z"></path>
          <path d="M18 31h12"></path>
          <path d="M20 31l-2 7h12l-2-7"></path>
        </svg>
      `,
      astronaut: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="15" r="5"></circle>
          <path d="M17 30v-7c0-3 3-5 7-5s7 2 7 5v7"></path>
          <path d="M18 31h12v7H18z"></path>
        </svg>
      `,
      flames: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 9c5 4 8 10 8 17v4H16v-4c0-7 3-13 8-17Z"></path>
          <path d="M24 39c-4 0-7-3-7-7 0-3 2-5 4-7 1 2 2 3 3 4 1-2 3-4 5-6 2 2 3 5 3 8 0 4-4 8-8 8Z"></path>
        </svg>
      `,
      launch: `
        <svg viewBox="0 0 48 48" aria-hidden="true">
          <circle cx="24" cy="24" r="7"></circle>
          <path d="M24 6v7M24 35v7M6 24h7M35 24h7M12 12l5 5M31 31l5 5M12 36l5-5M31 17l5-5"></path>
        </svg>
      `,
    };

    return icons[key] || icons.base;
  }

  function renderCelebrationVisual(event) {
    if (!event) {
      return "";
    }

    if (event.variant === "section" && event.rewardKey) {
      return `
        <div class="celebration-reward-visual reward-${event.rewardKey}" aria-hidden="true">
          ${missionRewardIconSvg(event.rewardKey)}
        </div>
      `;
    }

    if (event.variant === "final") {
      return `
        <div class="celebration-rocket-wrap">
          ${renderRocketScene(event.stageCount, event.boostCount, true)}
        </div>
      `;
    }

    return "";
  }

  class EncouragementMessageManager {
    constructor(theme) {
      this.theme = theme;
      this.lastIndexByPool = {};
    }

    pick(poolName) {
      const pool = this.theme.messages[poolName] || [];

      if (pool.length === 0) {
        return "";
      }

      if (pool.length === 1) {
        return pool[0];
      }

      let index = Math.floor(Math.random() * pool.length);
      if (index === this.lastIndexByPool[poolName]) {
        index = (index + 1) % pool.length;
      }

      this.lastIndexByPool[poolName] = index;
      return pool[index];
    }
  }

  class ProgressIndicator {
    constructor(root, theme) {
      this.root = root;
      this.theme = theme;
    }

    render(state) {
      if (!state.hasStarted || !state.currentSection) {
        this.root.innerHTML = "";
        return;
      }

      const section = state.currentSection;
      const dots = section.questions
        .map((question) => {
          const classes = [
            "mission-dot",
            question.isAnswered ? "is-complete" : "",
            question.isCurrent ? "is-current" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return `<span class="${classes}" aria-hidden="true"><span class="mission-dot-core"></span></span>`;
        })
        .join("");

      this.root.innerHTML = `
        <article class="gamification-panel mission-panel">
          <p class="gamification-kicker">${this.theme.missionLabel} ${section.index + 1} of ${state.totalSections}</p>
          <strong>Mission step ${state.currentQuestionNumber} of ${section.totalQuestions}</strong>
          <span>${section.answeredCount} of ${section.totalQuestions} rocket steps powered</span>
          <div
            class="mission-dots"
            role="img"
            aria-label="${section.answeredCount} of ${section.totalQuestions} questions finished in this mission"
          >
            ${dots}
          </div>
        </article>
      `;
    }
  }

  class OverallProgressBar {
    constructor(root, theme) {
      this.root = root;
      this.theme = theme;
    }

    render(state) {
      if (!state.hasStarted) {
        this.root.innerHTML = "";
        return;
      }

      this.root.innerHTML = `
        <article class="gamification-panel overall-panel">
          <p class="gamification-kicker">${state.answeredTotal} of ${state.totalQuestions} mission steps</p>
          <strong>${state.completedSections} of ${state.totalSections} missions completed</strong>
          <div class="overall-progress-rail" aria-hidden="true">
            <span class="overall-progress-fill" style="width: ${state.overallPercent}%"></span>
          </div>
          <span>${state.totalQuestions - state.answeredTotal} mission steps left before launch</span>
        </article>
      `;
    }
  }

  class RocketProgressVisual {
    constructor(root, theme) {
      this.root = root;
      this.theme = theme;
    }

    render(state) {
      if (!state.hasStarted) {
        this.root.innerHTML = "";
        return;
      }

      const stageCount = clamp(state.completedSections, 0, this.theme.rewardStages.length);
      const nextStage = this.theme.rewardStages[state.completedSections];
      const statusLine =
        stageCount === this.theme.rewardStages.length
          ? "All rocket parts are ready for lift-off."
          : `Next unlock: ${nextStage.label}.`;
      const rewardLine =
        state.midpointBoosts === 0
          ? "Star boosts appear at each mission halfway point."
          : `${state.midpointBoosts} star boosts are lighting the rocket so far.`;

      this.root.innerHTML = `
        <article class="gamification-panel rocket-panel ${stageCount === this.theme.rewardStages.length ? "is-finished" : ""}">
          <div class="rocket-copy">
            <p class="gamification-kicker">Rocket build</p>
            <strong>${stageCount} of ${this.theme.rewardStages.length} rocket stages unlocked</strong>
            <span>${statusLine}</span>
            <span>${rewardLine}</span>
          </div>
          ${renderRocketScene(stageCount, state.midpointBoosts, stageCount === this.theme.rewardStages.length)}
        </article>
      `;
    }
  }

  class QuestionFeedback {
    constructor(root, panelRoot, messageManager) {
      this.root = root;
      this.panelRoot = panelRoot;
      this.messageManager = messageManager;
    }

    clear() {
      this.root.innerHTML = "";
      this.panelRoot.classList.remove("is-feedback-correct", "is-feedback-gentle");
    }

    show(event) {
      this.clear();

      const isCorrect = event.isCorrect;
      const tone = isCorrect ? "correct" : "gentle";
      const message = this.messageManager.pick(isCorrect ? "correct" : "gentle");
      const effectLabel = isCorrect ? "sparkle" : "boost";

      this.root.innerHTML = `
        <div class="question-feedback-toast is-${tone}" role="status">
          <span class="question-feedback-effect" aria-hidden="true">${effectLabel}</span>
          <strong>${escapeHtml(message)}</strong>
        </div>
      `;

      this.panelRoot.classList.add(isCorrect ? "is-feedback-correct" : "is-feedback-gentle");
    }
  }

  class CelebrationOverlay {
    constructor(root, options = {}) {
      this.root = root;
      this.queue = [];
      this.current = null;
      this.timeoutId = null;
      this.onStateChange = options.onStateChange || null;
      this.boundClick = this.handleClick.bind(this);
      this.root.addEventListener("click", this.boundClick);
    }

    hasBlockingEvent() {
      return Boolean(
        (this.current && this.current.blocksMission) ||
          this.queue.some((event) => event.blocksMission),
      );
    }

    notifyStateChange(extraState = {}) {
      if (typeof this.onStateChange === "function") {
        this.onStateChange({
          currentEvent: this.current,
          hasBlocking: this.hasBlockingEvent(),
          ...extraState,
        });
      }
    }

    handleClick(event) {
      const dismissButton = event.target.closest("[data-dismiss-celebration]");
      if (!dismissButton) {
        return;
      }

      this.dismiss();
    }

    enqueue(event) {
      this.queue.push(event);
      if (this.current) {
        this.notifyStateChange();
        return;
      }

      this.showNext();
    }

    showNext() {
      if (this.current || this.queue.length === 0) {
        return;
      }

      this.current = this.queue.shift();
      const confetti = this.current.variant === "final"
        ? Array.from({ length: 10 }, (_, index) => {
            return `<span class="celebration-confetti celebration-confetti-${index + 1}"></span>`;
          }).join("")
        : "";

      this.root.innerHTML = `
        <div class="celebration-overlay is-${this.current.variant}" role="dialog" aria-modal="true">
          ${confetti}
          <div class="celebration-card">
            <div class="celebration-content">
              <p class="celebration-kicker">${escapeHtml(this.current.kicker)}</p>
              <h3>${escapeHtml(this.current.title)}</h3>
              ${celebrationBodyHtml(this.current.body)}
              ${this.current.reward ? `<div class="celebration-reward">${escapeHtml(this.current.reward)}</div>` : ""}
              ${renderCelebrationVisual(this.current)}
            </div>
            ${
              this.current.showButton
                ? `<div class="celebration-actions">
                    <button class="celebration-button" type="button" data-dismiss-celebration>${escapeHtml(
                      this.current.buttonLabel || "Back to Mission",
                    )}</button>
                  </div>`
                : ""
            }
          </div>
        </div>
      `;
      this.notifyStateChange();
    }

    dismiss() {
      if (this.timeoutId) {
        window.clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      const dismissedEvent = this.current;
      this.current = null;
      this.root.innerHTML = "";
      this.notifyStateChange({ dismissedEvent });

      if (this.queue.length > 0) {
        window.setTimeout(() => this.showNext(), 80);
      }
    }

    clearAll() {
      if (this.timeoutId) {
        window.clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      this.queue = [];
      this.current = null;
      this.root.innerHTML = "";
      this.notifyStateChange();
    }

    reset() {
      if (this.timeoutId) {
        window.clearTimeout(this.timeoutId);
        this.timeoutId = null;
      }

      this.queue = [];
      this.current = null;
      this.root.innerHTML = "";
      this.notifyStateChange();
    }
  }

  class GamificationController {
    constructor(options) {
      this.theme = options.theme || GAME_THEMES.rocketAdventure;
      this.roots = options.roots;
      this.messageManager = new EncouragementMessageManager(this.theme);
      this.progressIndicator = new ProgressIndicator(options.roots.sectionProgressRoot, this.theme);
      this.overallProgressBar = new OverallProgressBar(options.roots.overallProgressRoot, this.theme);
      this.rocketProgressVisual = new RocketProgressVisual(options.roots.rocketProgressRoot, this.theme);
      this.questionFeedback = new QuestionFeedback(
        options.roots.questionFeedbackRoot,
        options.roots.questionPanel,
        this.messageManager,
      );
      this.celebrationOverlay = new CelebrationOverlay(options.roots.overlayRoot, {
        onStateChange: options.callbacks?.onOverlayStateChange,
      });
      this.introductionSeen = new Set();
      this.pendingIntroductionSectionKey = null;
      this.pendingSectionCompletionKey = null;
      this.midpointSeen = new Set();
      this.sectionCompletionSeen = new Set();
      this.finalSeen = false;
      this.state = null;
      this.lastSyncedSectionKey = null;
    }

    sync(snapshot) {
      this.state = buildGamificationState(snapshot, this.theme);
      const currentSectionKey = this.state.currentSection?.key || null;
      const shouldReplayIntroduction =
        currentSectionKey !== null && this.pendingIntroductionSectionKey === currentSectionKey;
      const sectionChanged = currentSectionKey !== this.lastSyncedSectionKey;
      const shouldShowHud = this.state.hasStarted;
      this.roots.hudRoot.classList.toggle("is-hidden", !shouldShowHud);
      this.progressIndicator.render(this.state);
      this.overallProgressBar.render(this.state);
      this.rocketProgressVisual.render(this.state);
      this.maybeTriggerMissionIntroduction(this.state, {
        allowReplay: shouldReplayIntroduction || sectionChanged,
      });
      if (shouldReplayIntroduction) {
        this.pendingIntroductionSectionKey = null;
      }
      const shouldReplayCompletion =
        currentSectionKey !== null && this.pendingSectionCompletionKey === currentSectionKey;
      this.maybeTriggerSectionCompletion(this.state, {
        allowReplay: shouldReplayCompletion,
      });
      if (shouldReplayCompletion) {
        this.pendingSectionCompletionKey = null;
      }
      this.lastSyncedSectionKey = currentSectionKey;
      return this.state;
    }

    onAnswerEvaluated(snapshot, answerEvent) {
      const state = this.sync(snapshot);
      if (!state.hasStarted || !state.currentSection) {
        return state;
      }

      this.questionFeedback.show(answerEvent);
      this.maybeTriggerMidpoint(state);
      this.maybeTriggerSectionCompletion(state);
      return state;
    }

    onTestCompleted(snapshot) {
      const state = this.sync(snapshot);
      this.maybeTriggerFinalCelebration(state);
      return state;
    }

    clearTransientFeedback() {
      this.questionFeedback.clear();
      this.celebrationOverlay.clearAll();
    }

    hasBlockingOverlay() {
      return this.celebrationOverlay.hasBlockingEvent();
    }

    requestMissionIntroduction(sectionKey) {
      this.pendingIntroductionSectionKey = sectionKey || null;
    }

    requestMissionCompletion(sectionKey) {
      this.pendingSectionCompletionKey = sectionKey || null;
    }

    maybeTriggerMissionIntroduction(state, options = {}) {
      const section = state.currentSection;
      const allowReplay = Boolean(options.allowReplay);
      if (
        !state.hasStarted ||
        !section ||
        section.answeredCount > 0 ||
        (!allowReplay && this.introductionSeen.has(section.key))
      ) {
        return;
      }

      this.introductionSeen.add(section.key);
      const mission = storyMissionForSection(section.key);
      const reward = this.theme.rewardStages[section.index];
      const rewardLabel = mission?.rocketPart || reward?.label || section.label;

      this.celebrationOverlay.enqueue({
        variant: "intro",
        kicker: content?.gamification?.introductionTitle || "Mission Introduction",
        title: `${this.theme.missionLabel} ${section.index + 1}: ${mission?.title || section.label}`,
        body:
          mission?.introduction ||
          content?.gamification?.introductionBody ||
          "Captain Nova has a new mission briefing for you.",
        reward: formatTemplate(content?.gamification?.introductionReward || "Unlock: {reward}", {
          reward: rewardLabel,
        }),
        stageCount: state.completedSections,
        boostCount: state.midpointBoosts,
        showButton: true,
        buttonLabel: content?.gamification?.introductionButton || "Start mission",
        blocksMission: true,
      });
    }

    maybeTriggerMidpoint(state) {
      const section = state.currentSection;
      const midpointTarget = Math.ceil(section.totalQuestions / 2);
      if (section.answeredCount !== midpointTarget || this.midpointSeen.has(section.key)) {
        return;
      }

      this.midpointSeen.add(section.key);
      const mission = storyMissionForSection(section.key);
      this.celebrationOverlay.enqueue({
        variant: "midpoint",
        kicker: `${this.theme.missionLabel} ${section.index + 1}`,
        title: content?.gamification?.midpointTitle || "Mission Update",
        body:
          mission?.midMissionUpdate ||
          content?.gamification?.midpointBody ||
          "You are halfway through this mission and your rocket just got a boost.",
        stageCount: state.completedSections,
        boostCount: state.midpointBoosts,
        showButton: true,
        buttonLabel: content?.gamification?.midpointButton || "Continue mission",
        blocksMission: true,
      });
    }

    maybeTriggerSectionCompletion(state, options = {}) {
      const section = state.currentSection;
      const allowReplay = Boolean(options.allowReplay);
      if (!section.isCompleted || (!allowReplay && this.sectionCompletionSeen.has(section.key))) {
        return;
      }

      this.sectionCompletionSeen.add(section.key);
      const reward = this.theme.rewardStages[section.index];
      const mission = storyMissionForSection(section.key);
      const rewardLabel = mission?.rocketPart || reward.label;

      this.celebrationOverlay.enqueue({
        variant: "section",
        kicker: `${this.theme.missionLabel} ${section.index + 1} complete`,
        title: formatTemplate(
          content?.gamification?.sectionCompleteTitle || "{reward} unlocked!",
          { reward: rewardLabel },
        ),
        body:
          mission?.rewardDebrief ||
          formatTemplate(
            content?.gamification?.sectionCompleteBody ||
              "Mission complete. Captain Nova just locked {reward} into place.",
            { reward: rewardLabel },
          ),
        stageCount: state.completedSections,
        boostCount: state.midpointBoosts,
        rewardKey: reward.key,
        showButton: true,
        buttonLabel: content?.gamification?.sectionCompleteButton || "Next mission",
        blocksMission: true,
      });
    }

    maybeTriggerFinalCelebration(state) {
      if (!state.allQuestionsAnswered || this.finalSeen) {
        return;
      }

      this.finalSeen = true;
      this.celebrationOverlay.enqueue({
        variant: "final",
        kicker: `${this.theme.adventureLabel} complete`,
        title: content?.gamification?.finalTitle || "All missions complete!",
        body:
          content?.gamification?.finalBody ||
          "Amazing job finishing all 8 missions. Your rocket is ready for launch.",
        reward: content?.gamification?.finalReward || "Full rocket launch unlocked",
        stageCount: this.theme.rewardStages.length,
        boostCount: state.midpointBoosts,
        showButton: true,
        buttonLabel: content?.gamification?.finalButton || "Back to Mission",
        blocksMission: false,
      });
    }

    reset() {
      this.state = null;
      this.introductionSeen.clear();
      this.pendingIntroductionSectionKey = null;
      this.pendingSectionCompletionKey = null;
      this.midpointSeen.clear();
      this.sectionCompletionSeen.clear();
      this.finalSeen = false;
      this.lastSyncedSectionKey = null;
      this.questionFeedback.clear();
      this.celebrationOverlay.reset();
      this.roots.hudRoot.classList.add("is-hidden");
      this.progressIndicator.render({ hasStarted: false });
      this.overallProgressBar.render({ hasStarted: false });
      this.rocketProgressVisual.render({ hasStarted: false });
    }
  }

  function createGamificationController(options) {
    const theme = GAME_THEMES[options.themeId] || GAME_THEMES.rocketAdventure;
    return new GamificationController({
      theme,
      roots: options.roots,
      callbacks: options.callbacks,
    });
  }

  window.GiftedGamification = Object.freeze({
    themes: GAME_THEMES,
    createGamificationController,
  });
})();
