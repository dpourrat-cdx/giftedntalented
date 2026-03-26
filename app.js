const {
  SECTIONS: sections,
  QUESTIONS_PER_TEST_SECTION,
  buildTestSession,
  getQuestionPool,
} = window.GiftedQuestionBank;

const missionRewards =
  window.GiftedGamification?.themes?.rocketAdventure?.rewardStages || [
    { key: "base", label: "rocket base" },
    { key: "body", label: "rocket body" },
    { key: "window", label: "rocket window" },
    { key: "wings", label: "rocket wings" },
    { key: "engine", label: "rocket engine" },
    { key: "astronaut", label: "astronaut seat" },
    { key: "flames", label: "launch flames" },
    { key: "launch", label: "launch glow" },
  ];

const content = window.CaptainNovaContent;
const storyContent = content.story;
const scoreboardContent = content.scoreboard;
const parentAreaContent = content.parentArea;
const dashboardContent = content.dashboard;
const startContent = content.start;
const questionContent = content.question;
const resultsContent = content.results;

const dom = {
  heroEyebrow: document.getElementById("heroEyebrow"),
  heroTitle: document.getElementById("heroTitle"),
  heroCopy: document.getElementById("heroCopy"),
  heroMetricSteps: document.getElementById("heroMetricSteps"),
  heroMetricParts: document.getElementById("heroMetricParts"),
  heroMetricTime: document.getElementById("heroMetricTime"),
  leaderboardKicker: document.getElementById("leaderboardKicker"),
  answeredCount: document.getElementById("answeredCount"),
  progressFill: document.getElementById("progressFill"),
  buildKicker: document.getElementById("buildKicker"),
  sectionStats: document.getElementById("sectionStats"),
  missionsKicker: document.getElementById("missionsKicker"),
  gamificationHud: document.getElementById("gamificationHud"),
  sectionProgressRoot: document.getElementById("sectionProgressRoot"),
  overallProgressRoot: document.getElementById("overallProgressRoot"),
  rocketProgressRoot: document.getElementById("rocketProgressRoot"),
  questionFeedbackRoot: document.getElementById("questionFeedbackRoot"),
  gamificationOverlayRoot: document.getElementById("gamificationOverlayRoot"),
  nameEntry: document.getElementById("nameEntry"),
  childNameInput: document.getElementById("childNameInput"),
  nameLabel: document.getElementById("nameLabel"),
  nameHint: document.getElementById("nameHint"),
  playerNote: document.getElementById("playerNote"),
  startBriefBadge: document.getElementById("startBriefBadge"),
  startCounterBadge: document.getElementById("startCounterBadge"),
  storyPanel: document.getElementById("storyPanel"),
  questionStage: document.getElementById("questionStage"),
  leaderboardName: document.getElementById("leaderboardName"),
  leaderboardScore: document.getElementById("leaderboardScore"),
  leaderboardStatus: document.getElementById("leaderboardStatus"),
  parentArea: document.getElementById("parentArea"),
  parentAreaToggle: document.getElementById("parentAreaToggle"),
  parentAreaKicker: document.getElementById("parentAreaKicker"),
  parentAreaCopy: document.getElementById("parentAreaCopy"),
  storyOnlyToggle: document.getElementById("storyOnlyToggle"),
  storyOnlyToggleLabel: document.getElementById("storyOnlyToggleLabel"),
  storyOnlyToggleHelp: document.getElementById("storyOnlyToggleHelp"),
  resetScoresButton: document.getElementById("resetScoresButton"),
  timerLabel: document.getElementById("timerLabel"),
  timerDisplay: document.getElementById("timerDisplay"),
  scoreLabel: document.getElementById("scoreLabel"),
  scoreDisplay: document.getElementById("scoreDisplay"),
  tipCard: document.getElementById("tipCard"),
  tipKicker: document.getElementById("tipKicker"),
  tipCopy: document.getElementById("tipCopy"),
  questionPanel: document.getElementById("questionPanel"),
  sectionBadge: document.getElementById("sectionBadge"),
  questionCounter: document.getElementById("questionCounter"),
  questionPrompt: document.getElementById("questionPrompt"),
  questionStimulus: document.getElementById("questionStimulus"),
  optionsList: document.getElementById("optionsList"),
  feedbackPanel: document.getElementById("feedbackPanel"),
  nextHint: document.getElementById("nextHint"),
  nextButton: document.getElementById("nextButton"),
  restartButton: document.getElementById("restartButton"),
  resultsSection: document.getElementById("resultsSection"),
  resultsEyebrow: document.getElementById("resultsEyebrow"),
  scoreHeadline: document.getElementById("scoreHeadline"),
  scoreSummary: document.getElementById("scoreSummary"),
  timeSummary: document.getElementById("timeSummary"),
  endingStory: document.getElementById("endingStory"),
  resultsBreakdown: document.getElementById("resultsBreakdown"),
  retryButton: document.getElementById("retryButton"),
  backToQuestionsButton: document.getElementById("backToQuestionsButton"),
  reviewDetails: document.getElementById("reviewDetails"),
  reviewTitle: document.getElementById("reviewTitle"),
  reviewCopy: document.getElementById("reviewCopy"),
  reviewList: document.getElementById("reviewList"),
};

let sessionQuestions = [];
let currentIndex = 0;
let selectedAnswers = [];
let validatedAnswers = [];
let timerId = null;
let isSubmitted = false;
let hasStarted = false;
let playerName = "";
let timeRemaining = 0;
let gamificationController = null;
let scoreboardController = null;
let lastRenderedQuestionIndex = -1;
let autoAdvanceTimeoutId = null;
let autoAdvanceQuestionIndex = -1;
let isTimerPaused = false;
let deferredAdvanceQuestionIndex = -1;
let suppressNextButtonUntil = 0;
let pendingAnswerQuestionIndex = -1;
let storyOnlyModeEnabled = false;
let isStoryOnlySession = false;
let questionBankLookup = null;
let isStartingAttempt = false;

function totalQuestions() {
  return sessionQuestions.length;
}

function buildGamificationSnapshot() {
  return {
    sections,
    questionsPerSection: QUESTIONS_PER_TEST_SECTION,
    sessionQuestions,
    validatedAnswers,
    currentIndex,
    hasStarted,
    isSubmitted,
    playerName,
  };
}

function syncGamification() {
  if (!gamificationController) {
    return;
  }

  gamificationController.sync(buildGamificationSnapshot(), {
    skipSectionCompletion: pendingAnswerQuestionIndex !== -1,
  });
}

function testDurationSeconds() {
  return totalQuestions() * 30;
}

function createNewSession() {
  clearPendingAutoAdvance();
  deferredAdvanceQuestionIndex = -1;
  isTimerPaused = false;
  isStoryOnlySession = false;
  if (scoreboardController && typeof scoreboardController.resetActiveAttempt === "function") {
    scoreboardController.resetActiveAttempt();
  }
  sessionQuestions = buildTestSession();
  selectedAnswers = Array(totalQuestions()).fill(null);
  validatedAnswers = Array(totalQuestions()).fill(null);
  currentIndex = 0;
  timeRemaining = testDurationSeconds();
  isSubmitted = false;
  hasStarted = false;
  lastRenderedQuestionIndex = -1;
}

function canonicalQuestionByBankId(bankId) {
  if (!bankId || typeof getQuestionPool !== "function") {
    return null;
  }

  if (!questionBankLookup) {
    questionBankLookup = new Map();
    const questionPool = getQuestionPool();
    for (const section of sections) {
      if (!Array.isArray(questionPool?.[section])) {
        continue;
      }

      questionPool[section].forEach((question) => {
        if (question?.bankId) {
          questionBankLookup.set(question.bankId, question);
        }
      });
    }
  }

  return questionBankLookup.get(bankId) || null;
}

function normalizeAttemptQuestion(question, index) {
  if (!question || typeof question !== "object") {
    return null;
  }

  const candidate = question;
  const bankId = typeof candidate.bankId === "string" ? candidate.bankId : "";
  const canonicalQuestion = canonicalQuestionByBankId(bankId);
  const options = Array.isArray(candidate.options)
    ? candidate.options.map((option) => String(option))
    : Array.isArray(canonicalQuestion?.options)
      ? canonicalQuestion.options.map((option) => String(option))
      : null;
  const canonicalCorrectOption =
    Array.isArray(canonicalQuestion?.options) &&
    Number.isInteger(canonicalQuestion?.answer) &&
    canonicalQuestion.answer >= 0 &&
    canonicalQuestion.answer < canonicalQuestion.options.length
      ? String(canonicalQuestion.options[canonicalQuestion.answer])
      : null;
  const derivedAnswerIndex =
    canonicalCorrectOption && Array.isArray(options)
      ? options.findIndex((option) => option === canonicalCorrectOption)
      : -1;
  const answer =
    Number.isInteger(candidate.answer) && candidate.answer >= 0 && candidate.answer <= 3
      ? candidate.answer
      : Number.isInteger(candidate.correctAnswer) && candidate.correctAnswer >= 0 && candidate.correctAnswer <= 3
        ? candidate.correctAnswer
        : derivedAnswerIndex >= 0 && derivedAnswerIndex <= 3
          ? derivedAnswerIndex
        : null;
  const id =
    Number.isInteger(candidate.id) && candidate.id > 0
      ? candidate.id
      : Number.isInteger(candidate.questionId) && candidate.questionId > 0
        ? candidate.questionId
        : index + 1;
  const section =
    typeof candidate.section === "string" && candidate.section
      ? candidate.section
      : typeof canonicalQuestion?.section === "string"
        ? canonicalQuestion.section
        : "";
  const prompt =
    typeof candidate.prompt === "string" && candidate.prompt
      ? candidate.prompt
      : typeof canonicalQuestion?.prompt === "string"
        ? canonicalQuestion.prompt
        : "";
  const explanation =
    typeof candidate.explanation === "string" && candidate.explanation
      ? candidate.explanation
      : typeof canonicalQuestion?.explanation === "string"
        ? canonicalQuestion.explanation
        : "";
  const stimulus =
    typeof candidate.stimulus === "string"
      ? candidate.stimulus
      : typeof canonicalQuestion?.stimulus === "string"
        ? canonicalQuestion.stimulus
        : "";

  if (!id || !bankId || !section || !prompt || !options || options.length !== 4 || answer === null) {
    return null;
  }

  return {
    id,
    questionId: id,
    bankId,
    section,
    prompt,
    options,
    answer,
    explanation,
    stimulus,
  };
}

function normalizeAttemptQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    return null;
  }

  const normalized = questions.map((question, index) => normalizeAttemptQuestion(question, index));
  if (normalized.some((question) => !question)) {
    return null;
  }

  return normalized;
}

function applyAttemptQuestions(questions) {
  const normalizedQuestions = normalizeAttemptQuestions(questions);
  if (!normalizedQuestions || normalizedQuestions.length !== totalQuestions()) {
    return false;
  }

  sessionQuestions = normalizedQuestions;
  selectedAnswers = Array(totalQuestions()).fill(null);
  validatedAnswers = Array(totalQuestions()).fill(null);
  currentIndex = 0;
  timeRemaining = testDurationSeconds();
  lastRenderedQuestionIndex = -1;
  return true;
}

function answeredTotal() {
  return validatedAnswers.filter((answer) => answer !== null).length;
}

function liveCorrectTotal() {
  return validatedAnswers.filter((answer, index) => answer === sessionQuestions[index].answer).length;
}

function scorePercent(correct, total = totalQuestions()) {
  return Math.round((correct / total) * 100);
}

function formatScore(correct, total = totalQuestions()) {
  return `${correct}/${total} (${scorePercent(correct, total)}%)`;
}

function formatTime(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = String(Math.floor(safeSeconds / 60)).padStart(2, "0");
  const remainder = String(safeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function elapsedMissionSeconds() {
  return Math.max(0, testDurationSeconds() - timeRemaining);
}

function updateTimerDisplay() {
  dom.timerDisplay.textContent = formatTime(timeRemaining);
}

function clearTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function clearPendingAutoAdvance() {
  if (autoAdvanceTimeoutId) {
    window.clearTimeout(autoAdvanceTimeoutId);
    autoAdvanceTimeoutId = null;
  }

  autoAdvanceQuestionIndex = -1;
}

function setTimerPaused(paused) {
  isTimerPaused = Boolean(paused);
}

function isAutoAdvancePendingForCurrentQuestion(questionIndex = currentIndex) {
  return autoAdvanceTimeoutId !== null && autoAdvanceQuestionIndex === questionIndex;
}

function shouldAdvanceToNextMission(questionIndex = currentIndex) {
  const question = questionAt(questionIndex);
  if (!question || validatedAnswers[questionIndex] === null) {
    return false;
  }

  return isSectionCompleted(question.section);
}

function advanceToNextMissionStep(options = {}) {
  clearPendingAutoAdvance();
  deferredAdvanceQuestionIndex = -1;

  if (!isSubmitted && allQuestionsAnswered()) {
    clearTransientGamificationUi();
    submitTest();
    return;
  }

  const shouldPreferNextMission = Boolean(options.preferNextMission) || shouldAdvanceToNextMission();
  const nextIndex = shouldPreferNextMission
    ? nextIncompleteMissionIndexAfterCurrent()
    : nextUnansweredIndexAfterCurrent();
  if (nextIndex === -1) {
    clearTransientGamificationUi();
    submitTest();
    return;
  }

  clearTransientGamificationUi();
  if (shouldPreferNextMission && gamificationController) {
    gamificationController.requestMissionIntroduction(sessionQuestions[nextIndex]?.section);
  }
  currentIndex = nextIndex;
  renderQuestion();
}

function scheduleAutoAdvance(questionIndex) {
  clearPendingAutoAdvance();
  autoAdvanceQuestionIndex = questionIndex;
  autoAdvanceTimeoutId = window.setTimeout(() => {
    if (isSubmitted || currentIndex !== questionIndex || validatedAnswers[questionIndex] === null) {
      clearPendingAutoAdvance();
      return;
    }

    advanceToNextMissionStep();
  }, 1000);
}

function startTimer() {
  clearTimer();
  timerId = window.setInterval(() => {
    if (isSubmitted) {
      clearTimer();
      return;
    }

    if (isTimerPaused) {
      return;
    }

    timeRemaining -= 1;
    updateTimerDisplay();

    if (timeRemaining <= 0) {
      timeRemaining = 0;
      updateTimerDisplay();
      submitTest();
    }
  }, 1000);
}

function questionAt(index) {
  return sessionQuestions[index];
}

function sectionQuestions(section) {
  return sessionQuestions.filter((question) => question.section === section);
}

function firstUnansweredIndex() {
  return validatedAnswers.findIndex((answer) => answer === null);
}

function firstUnansweredIndexForSection(section) {
  const unanswered = sessionQuestions.findIndex(
    (question, index) => question.section === section && validatedAnswers[index] === null,
  );

  if (unanswered !== -1) {
    return unanswered;
  }

  return sessionQuestions.findIndex((question) => question.section === section);
}

function isSectionCompleted(section) {
  const totalInSection = sessionQuestions.filter((question) => question.section === section).length;
  if (totalInSection === 0) {
    return false;
  }

  return sessionQuestions.every((question, index) => {
    return question.section !== section || validatedAnswers[index] !== null;
  });
}

function isSectionPerfect(section) {
  if (!isSectionCompleted(section)) {
    return false;
  }

  return sessionQuestions.every((question, index) => {
    return question.section !== section || validatedAnswers[index] === question.answer;
  });
}

function nextIncompleteSectionAfter(section) {
  const sectionIndex = sections.indexOf(section);
  if (sectionIndex === -1) {
    return null;
  }

  for (let offset = 1; offset <= sections.length; offset += 1) {
    const candidateSection = sections[(sectionIndex + offset) % sections.length];
    if (!isSectionCompleted(candidateSection)) {
      return candidateSection;
    }
  }

  return null;
}

function nextIncompleteMissionIndexAfterCurrent() {
  const currentQuestion = questionAt(currentIndex);
  if (!currentQuestion) {
    return -1;
  }

  const nextSection = nextIncompleteSectionAfter(currentQuestion.section);
  return nextSection ? firstUnansweredIndexForSection(nextSection) : -1;
}

function nextUnansweredIndexAfterCurrent() {
  for (let index = currentIndex + 1; index < totalQuestions(); index += 1) {
    if (validatedAnswers[index] === null) {
      return index;
    }
  }

  return firstUnansweredIndex();
}

function completeSectionInStoryOnly(section) {
  sessionQuestions.forEach((question, index) => {
    if (question.section !== section || validatedAnswers[index] !== null) {
      return;
    }

    selectedAnswers[index] = question.answer;
    validatedAnswers[index] = question.answer;
  });

  updateProgress();
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, (letter) => letter.toUpperCase());
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

function totalMissionMinutes() {
  return Math.round((sections.length * QUESTIONS_PER_TEST_SECTION * 30) / 60);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function applyStaticCopy() {
  document.title = content.hero.title;
  dom.heroEyebrow.textContent = content.hero.eyebrow;
  dom.heroTitle.textContent = content.hero.title;
  dom.heroCopy.textContent = content.hero.copy;
  dom.heroMetricSteps.textContent = formatTemplate(content.hero.metrics.steps, {
    count: sections.length * QUESTIONS_PER_TEST_SECTION,
  });
  dom.heroMetricParts.textContent = formatTemplate(content.hero.metrics.parts, {
    count: sections.length,
  });
  dom.heroMetricTime.textContent = formatTemplate(content.hero.metrics.time, {
    minutes: totalMissionMinutes(),
  });

  dom.leaderboardKicker.textContent = scoreboardContent.kicker;
  dom.parentAreaToggle.textContent = parentAreaContent.toggle;
  dom.parentAreaKicker.textContent = parentAreaContent.kicker;
  dom.parentAreaCopy.textContent = parentAreaContent.copy;
  dom.storyOnlyToggleLabel.textContent = parentAreaContent.storyOnlyLabel;
  dom.storyOnlyToggleHelp.textContent = parentAreaContent.storyOnlyHelp;
  dom.restartButton.textContent = parentAreaContent.restart;
  dom.resetScoresButton.textContent = parentAreaContent.reset;

  dom.buildKicker.textContent = dashboardContent.buildTitle;
  dom.timerLabel.textContent = dashboardContent.timerLabel;
  dom.scoreLabel.textContent = dashboardContent.scoreLabel;
  dom.missionsKicker.textContent = dashboardContent.missionsTitle;
  dom.tipKicker.textContent = dashboardContent.tipTitle;
  dom.tipCopy.textContent = dashboardContent.tipCopy;

  dom.startBriefBadge.textContent = startContent.badge;
  dom.startCounterBadge.textContent = formatTemplate(startContent.counter, {
    count: sections.length * QUESTIONS_PER_TEST_SECTION,
    missions: sections.length,
  });
  dom.nameLabel.textContent = startContent.nameLabel;
  dom.childNameInput.placeholder = startContent.namePlaceholder;

  dom.resultsEyebrow.textContent = resultsContent.eyebrow;
  dom.retryButton.textContent = resultsContent.retry;
  dom.backToQuestionsButton.textContent = resultsContent.back;
  dom.reviewTitle.textContent = resultsContent.debriefTitle;
  dom.reviewCopy.textContent = resultsContent.debriefCopy;
  dom.nextButton.textContent = questionContent.buttons.check;
}

function missionStoryForSection(section) {
  return storyContent.missions.find((mission) => mission.section === section) || null;
}

function endingStoryForPercentage(percentage) {
  return (
    storyContent.endings.find(
      (ending) => percentage >= ending.minScore && percentage <= ending.maxScore,
    ) || storyContent.endings[storyContent.endings.length - 1]
  );
}

function storyLines(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === "") {
    return [];
  }

  return [String(value)];
}

function formatStoryInline(value) {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function buildStoryParagraphs(lines) {
  return storyLines(lines).map((line) => `<p>${formatStoryInline(line)}</p>`).join("");
}

function buildStoryArtworkElement(artwork, options = {}) {
  if (!artwork || !artwork.src) {
    return null;
  }

  const figure = document.createElement("figure");
  figure.className = options.figureClass || "story-artwork-figure";

  const picture = document.createElement("picture");

  if (artwork.mobileSrc) {
    const mobileSource = document.createElement("source");
    mobileSource.media = "(max-width: 720px)";
    mobileSource.srcset = artwork.mobileSrc;
    picture.appendChild(mobileSource);
  }

  if (artwork.desktopSrc) {
    const desktopSource = document.createElement("source");
    desktopSource.media = "(min-width: 721px)";
    desktopSource.srcset = artwork.desktopSrc;
    picture.appendChild(desktopSource);
  }

  const image = document.createElement("img");
  image.className = options.imageClass || "story-artwork-image";
  image.src = artwork.src;
  image.alt = artwork.alt || `${storyContent.title} artwork`;
  image.loading = "lazy";
  image.decoding = "async";

  picture.appendChild(image);
  figure.appendChild(picture);
  return figure;
}

function buildStoryArtworkMarkup(artwork, options = {}) {
  if (!artwork || !artwork.src) {
    return "";
  }

  const figureClass = options.figureClass || "story-artwork-figure";
  const imageClass = options.imageClass || "story-artwork-image";
  const alt = artwork.alt || `${storyContent.title} artwork`;
  const mobileSource = artwork.mobileSrc
    ? `<source media="(max-width: 720px)" srcset="${escapeHtml(artwork.mobileSrc)}" />`
    : "";
  const desktopSource = artwork.desktopSrc
    ? `<source media="(min-width: 721px)" srcset="${escapeHtml(artwork.desktopSrc)}" />`
    : "";

  return `
    <figure class="${figureClass}">
      <picture>
        ${mobileSource}
        ${desktopSource}
        <img
          class="${imageClass}"
          src="${escapeHtml(artwork.src)}"
          alt="${escapeHtml(alt)}"
          loading="lazy"
          decoding="async"
        />
      </picture>
    </figure>
  `;
}

function resultsGalleryItems(percentage, sectionScores) {
  const ending = endingStoryForPercentage(percentage);
  const items = [
    {
      kicker: storyContent.introduction.kicker,
      title: storyContent.title,
      meta: storyContent.introduction.pill,
      artwork: storyContent.introductionArtwork,
    },
  ];

  for (const section of sections) {
    const mission = missionStoryForSection(section);
    if (!mission || !mission.completionArtwork) {
      continue;
    }

    const missionScore = sectionScores[section] || { correct: 0, total: 0 };
    const meta = isStoryOnlySession
      ? "Story scene unlocked"
      : `${formatTemplate(resultsContent.sectionSummary, missionScore)} • ${formatTemplate(
          resultsContent.sectionPercent,
          { percent: scorePercent(missionScore.correct, missionScore.total) },
        )}`;

    items.push({
      kicker: `Mission ${mission.number}`,
      title: mission.title,
      meta,
      artwork: mission.completionArtwork,
    });
  }

  items.push({
    kicker: ending.label,
    title: resultsContent.endingTitle,
    meta: isStoryOnlySession
      ? "Final story ending"
      : formatTemplate(resultsContent.scorePill, { percent: percentage }),
    artwork: storyContent.endingArtwork,
  });

  return items;
}

function renderResultsGallery(percentage, sectionScores) {
  dom.resultsBreakdown.innerHTML = "";

  resultsGalleryItems(percentage, sectionScores).forEach((item) => {
    const card = document.createElement("article");
    card.className = "breakdown-card";
    card.innerHTML = `
      ${buildStoryArtworkMarkup(item.artwork, {
        figureClass: "breakdown-media",
        imageClass: "breakdown-image",
      })}
      <div class="breakdown-copy">
        <p class="breakdown-kicker">${escapeHtml(item.kicker)}</p>
        <strong>${escapeHtml(item.title)}</strong>
        <span class="breakdown-meta">${escapeHtml(item.meta)}</span>
      </div>
    `;
    dom.resultsBreakdown.appendChild(card);
  });
}

function buildMissionUiState(section) {
  const missionQuestions = sessionQuestions
    .map((question, index) => ({ question, index }))
    .filter((entry) => entry.question.section === section);
  const answeredCount = missionQuestions.filter((entry) => validatedAnswers[entry.index] !== null).length;
  const currentMissionQuestionIndex = missionQuestions.findIndex((entry) => entry.index === currentIndex);

  return {
    section,
    totalQuestions: missionQuestions.length,
    answeredCount,
    currentQuestionNumber: currentMissionQuestionIndex === -1 ? 1 : currentMissionQuestionIndex + 1,
    questions: missionQuestions.map((entry, missionIndex) => {
      const validatedAnswer = validatedAnswers[entry.index];
      const isAnswered = validatedAnswer !== null;
      const isCorrect = isAnswered && validatedAnswer === entry.question.answer;

      return {
        missionIndex,
        isAnswered,
        isCorrect,
        isWrong: isAnswered && !isCorrect,
        isCurrent: hasStarted && entry.index === currentIndex,
      };
    }),
  };
}

function completedSectionCount() {
  return sections.filter((section) => buildMissionUiState(section).answeredCount === QUESTIONS_PER_TEST_SECTION)
    .length;
}

function midpointBoostCount() {
  return sections.filter((section) => {
    const missionState = buildMissionUiState(section);
    return missionState.answeredCount >= Math.ceil(missionState.totalQuestions / 2);
  }).length;
}

function nextRocketReward() {
  return missionRewards[completedSectionCount()] || null;
}

function renderMissionDots(missionState) {
  if (!missionState || missionState.totalQuestions === 0) {
    return "";
  }

  const dots = missionState.questions
    .map((question) => {
      const classes = [
        "mission-dot",
        question.isCorrect ? "is-correct" : "",
        question.isWrong ? "is-wrong" : "",
        question.isCurrent && !question.isAnswered ? "is-current" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<span class="${classes}" aria-hidden="true"><span class="mission-dot-core"></span></span>`;
    })
    .join("");

  return `
    <div
      class="mission-dots mission-dots-inline"
      role="img"
      aria-label="${missionState.answeredCount} of ${missionState.totalQuestions} steps finished in this mission"
    >
      ${dots}
    </div>
  `;
}

function renderMissionDotsElement(missionState) {
  if (!missionState || missionState.totalQuestions === 0) {
    return null;
  }

  const root = document.createElement("div");
  root.className = "mission-dots mission-dots-inline";
  root.setAttribute("role", "img");
  root.setAttribute(
    "aria-label",
    `${missionState.answeredCount} of ${missionState.totalQuestions} steps finished in this mission`,
  );

  missionState.questions.forEach((question) => {
    const dot = document.createElement("span");
    dot.className = [
      "mission-dot",
      question.isCorrect ? "is-correct" : "",
      question.isWrong ? "is-wrong" : "",
      question.isCurrent && !question.isAnswered ? "is-current" : "",
    ]
      .filter(Boolean)
      .join(" ");
    dot.setAttribute("aria-hidden", "true");

    const core = document.createElement("span");
    core.className = "mission-dot-core";
    dot.appendChild(core);
    root.appendChild(dot);
  });

  return root;
}

function renderRocketSceneMarkup(stageCount, boostCount) {
  const stars = Array.from({ length: clamp(boostCount, 0, 8) }, (_, index) => {
    return `<span class="rocket-star rocket-star-${index + 1}"></span>`;
  }).join("");

  const partClass = (unlocked) => (unlocked ? "is-unlocked" : "");

  return `
    <div class="rocket-scene rocket-scene-mini" aria-hidden="true">
      <div class="rocket-stars">${stars}</div>
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

function renderStartBadges() {
  if (!hasStarted) {
    dom.startBriefBadge.textContent = startContent.badge;
    dom.startCounterBadge.textContent = formatTemplate(startContent.counter, {
      count: sections.length * QUESTIONS_PER_TEST_SECTION,
      missions: sections.length,
    });
    return;
  }

  const question = questionAt(currentIndex);
  const mission = missionStoryForSection(question.section);
  const missionState = buildMissionUiState(question.section);
  dom.startBriefBadge.textContent = `Mission ${mission ? mission.number : sections.indexOf(question.section) + 1} of ${sections.length}`;
  dom.startCounterBadge.textContent = `Mission Step ${missionState.currentQuestionNumber} of ${missionState.totalQuestions}`;
}

function renderStoryPanel(content) {
  if (!content) {
    dom.storyPanel.className = "story-panel";
    dom.storyPanel.innerHTML = "";
    return;
  }

  dom.storyPanel.className = `story-panel${content.compact ? " is-compact" : ""}`;
  dom.storyPanel.innerHTML = "";

  const heading = document.createElement("div");
  heading.className = "story-heading";

  if (content.iconKey) {
    const icon = document.createElement("span");
    icon.className = `story-icon reward-${content.iconKey}`;
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = missionRewardSvg(content.iconKey);
    heading.appendChild(icon);
  }

  const headingCopy = document.createElement("div");
  headingCopy.className = "story-heading-copy";

  const kicker = document.createElement("p");
  kicker.className = "story-kicker";
  kicker.textContent = content.kicker;
  headingCopy.appendChild(kicker);

  const title = document.createElement("h3");
  title.textContent = content.title;
  headingCopy.appendChild(title);

  heading.appendChild(headingCopy);
  dom.storyPanel.appendChild(heading);

  if (content.pill || content.secondaryPill) {
    const pills = document.createElement("div");
    pills.className = "story-pills";

    [content.pill, content.secondaryPill].filter(Boolean).forEach((pillText) => {
      const pill = document.createElement("span");
      pill.className = "story-pill";
      pill.textContent = pillText;
      pills.appendChild(pill);
    });

    dom.storyPanel.appendChild(pills);
  }

  if (content.artwork) {
    const artwork = buildStoryArtworkElement(content.artwork, content.artworkOptions);
    if (artwork) {
      dom.storyPanel.appendChild(artwork);
    }
  }

  const lines = storyLines(content.lines);
  if (lines.length) {
    const storyCopy = document.createElement("div");
    storyCopy.className = "story-copy";
    storyCopy.innerHTML = buildStoryParagraphs(lines);
    dom.storyPanel.appendChild(storyCopy);
  }

  if (content.footerNode) {
    dom.storyPanel.appendChild(content.footerNode);
  }
}

function renderIntroductionStory() {
  renderStoryPanel({
    kicker: storyContent.introduction.kicker,
    title: storyContent.title,
    pill: storyContent.introduction.pill,
    secondaryPill: storyContent.introduction.secondaryPill,
    artwork: storyContent.introductionArtwork,
    artworkOptions: {
      figureClass: "story-artwork-figure is-introduction",
      imageClass: "story-artwork-image is-introduction",
    },
    lines: storyLines(storyContent.introduction.text),
  });
}

function renderMissionStory(section) {
  const mission = missionStoryForSection(section);
  if (!mission) {
    dom.storyPanel.innerHTML = "";
    return;
  }
  const reward = missionRewardForIndex(mission.number - 1);
  const missionState = buildMissionUiState(section);

  renderStoryPanel({
    kicker: `Mission ${mission.number}`,
    title: mission.title,
    pill: `Unlock: ${mission.rocketPart}`,
    secondaryPill: section,
    lines: [],
    compact: true,
    iconKey: reward.key,
    footerNode: renderMissionDotsElement(missionState),
  });
}

function renderEndingStory(percentage) {
  const ending = endingStoryForPercentage(percentage);
  dom.endingStory.innerHTML = `
    <p class="story-kicker">${escapeHtml(ending.label)}</p>
    <h3>${escapeHtml(`${ending.label} - ${resultsContent.endingTitle}`)}</h3>
    <div class="story-pills">
      <span class="story-pill">${escapeHtml(formatTemplate(resultsContent.scorePill, { percent: percentage }))}</span>
      <span class="story-pill">${escapeHtml(resultsContent.completePill)}</span>
    </div>
    ${buildStoryArtworkMarkup(storyContent.endingArtwork, {
      figureClass: "story-artwork-figure is-ending",
      imageClass: "story-artwork-image is-ending",
    })}
    <div class="story-copy">
      ${buildStoryParagraphs(ending.text)}
    </div>
  `;
}

function missionRewardForIndex(sectionIndex) {
  return missionRewards[sectionIndex] || missionRewards[missionRewards.length - 1];
}

function missionRewardSvg(key) {
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

function setSectionBadgeContent(label) {
  const sectionIndex = sections.indexOf(label);
  if (sectionIndex === -1) {
    dom.sectionBadge.textContent = label;
    return;
  }

  const mission = missionStoryForSection(label);
  const reward = missionRewardForIndex(sectionIndex);
  dom.sectionBadge.innerHTML = `
    <span class="mission-badge-icon reward-${reward.key}" aria-hidden="true">
      ${missionRewardSvg(reward.key)}
    </span>
    <span>${escapeHtml(mission ? `Mission ${mission.number}: ${mission.title}` : label)}</span>
  `;
}

function missionCompletionStarBadgeSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 3.2l2.3 4.67 5.15.75-3.73 3.64.88 5.14L12 14.98 7.4 17.4l.88-5.14L4.55 8.62l5.15-.75L12 3.2z"></path>
    </svg>
  `;
}

function missionCompletionCheckBadgeSvg() {
  return `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        stroke-width="2.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M5.5 12.5l4.2 4.2L18.5 8"
      ></path>
    </svg>
  `;
}

function goToSection(section) {
  if (!hasStarted) {
    return;
  }

  clearPendingAutoAdvance();
  deferredAdvanceQuestionIndex = -1;
  if (gamificationController) {
    if (isSectionCompleted(section)) {
      gamificationController.requestMissionCompletion(section);
    } else {
      gamificationController.requestMissionIntroduction(section);
    }
  }
  currentIndex = firstUnansweredIndexForSection(section);
  renderQuestion();
}

function buildSectionButton(section, isActive, sectionIndex) {
  const reward = missionRewardForIndex(sectionIndex);
  const mission = missionStoryForSection(section);
  const isCompleted = isSectionCompleted(section);
  const isPerfect = isCompleted && isSectionPerfect(section);
  const completionLabel = isPerfect ? "Mission completed with all answers correct." : "Mission completed.";
  const completionBadgeClass = isPerfect ? "is-perfect" : "is-check";
  const completionBadgeIcon = isPerfect
    ? missionCompletionStarBadgeSvg()
    : missionCompletionCheckBadgeSvg();
  const button = document.createElement("button");
  button.type = "button";
  button.className = "section-button";
  button.disabled = !hasStarted;
  button.setAttribute(
    "aria-label",
    mission
      ? `Mission ${mission.number}. ${mission.title}. Unlock ${mission.rocketPart}.${isCompleted ? ` ${completionLabel}` : ""}`
      : `${section}. Mission reward: ${reward.label}.`,
  );

  if (isActive) {
    button.classList.add("is-active");
  }

  if (isCompleted) {
    button.classList.add("is-complete");
    if (!isPerfect) {
      button.classList.add("is-complete-check");
    }
  }

  button.innerHTML = `
    ${
      isCompleted
        ? `<span class="section-button-status ${completionBadgeClass}" aria-hidden="true">
            <span class="section-button-status-icon ${completionBadgeClass}">${completionBadgeIcon}</span>
            <span class="section-button-status-text">Done</span>
          </span>`
        : ""
    }
    <span class="section-button-main">
      <span class="mission-reward-icon reward-${reward.key}" aria-hidden="true">
        ${missionRewardSvg(reward.key)}
      </span>
      <span class="section-button-copy">
        ${mission ? `<span class="section-button-overline">Mission ${mission.number}</span>` : ""}
        <strong>${mission ? mission.title : section}</strong>
      </span>
    </span>
  `;
  button.addEventListener("click", () => goToSection(section));
  return button;
}

function renderSectionStats() {
  dom.sectionStats.innerHTML = "";
  const activeSection = hasStarted ? questionAt(currentIndex).section : "";

  sections.forEach((section, sectionIndex) => {
    const isActive = activeSection === section;
    dom.sectionStats.appendChild(buildSectionButton(section, isActive, sectionIndex));
  });
}

function updateProgress() {
  const totalAnswered = answeredTotal();
  dom.answeredCount.textContent = `${totalAnswered} of ${totalQuestions()}`;
  dom.progressFill.style.width = `${(totalAnswered / totalQuestions()) * 100}%`;
  dom.scoreDisplay.textContent = formatScore(liveCorrectTotal());
  renderSectionStats();
  syncGamification();
}

function allQuestionsAnswered() {
  return answeredTotal() === totalQuestions();
}

function renderFeedback(question, validatedAnswer) {
  dom.feedbackPanel.className = "feedback-panel is-hidden";
  dom.feedbackPanel.innerHTML = "";
}

function renderQuestion() {
  const shouldResetStageScroll = hasStarted && lastRenderedQuestionIndex !== currentIndex;
  renderStartBadges();
  renderSectionStats();

  if (!hasStarted) {
    dom.questionPanel.classList.add("is-start-screen");
    dom.tipCard?.classList.remove("is-hidden");
    dom.nameEntry.classList.remove("is-hidden");
    dom.playerNote.classList.add("is-hidden");
    dom.questionPrompt.textContent = playerName
      ? formatTemplate(startContent.readyPrompt, { name: playerName })
      : startContent.emptyPrompt;
    dom.questionStimulus.textContent = "";
    dom.questionStimulus.classList.add("is-hidden");
    dom.optionsList.innerHTML = "";
    dom.feedbackPanel.className = "feedback-panel is-hidden";
    dom.feedbackPanel.innerHTML = "";
    renderIntroductionStory();
    dom.nameHint.textContent = playerName
      ? (storyOnlyModeEnabled ? startContent.readyStoryOnlyNameHint : startContent.readyNameHint)
      : startContent.emptyNameHint;
    dom.nextHint.textContent = playerName
      ? (storyOnlyModeEnabled ? startContent.readyStoryOnlyNextHint : startContent.readyNextHint)
      : startContent.emptyNextHint;
    dom.nextHint.classList.remove("is-hidden");
    dom.nextButton.textContent = questionContent.buttons.check;
    dom.nextButton.disabled = true;
    lastRenderedQuestionIndex = -1;
    dom.questionStage.scrollTop = 0;
    syncGamification();
    return;
  }

  dom.questionPanel.classList.remove("is-start-screen");
  dom.tipCard?.classList.add("is-hidden");
  dom.nameEntry.classList.add("is-hidden");
  const question = questionAt(currentIndex);
  const mission = missionStoryForSection(question.section);
  dom.playerNote.textContent = mission
    ? formatTemplate(questionContent.playerNote, {
        name: playerName,
        missionNumber: mission.number,
      })
    : formatTemplate(startContent.playerReadyNote, { name: playerName });
  dom.playerNote.classList.remove("is-hidden");
  renderMissionStory(question.section);
  setSectionBadgeContent(question.section);

  if (isStoryOnlySession && !isSubmitted) {
    const missionNumber = mission ? mission.number : sections.indexOf(question.section) + 1;
    dom.questionCounter.textContent = `Mission ${missionNumber} story route`;
    dom.questionPrompt.textContent = questionContent.storyOnlyPrompt;
    dom.questionStimulus.textContent = "";
    dom.questionStimulus.classList.add("is-hidden");
    dom.optionsList.innerHTML = "";
    dom.feedbackPanel.className = "feedback-panel is-hidden";
    dom.feedbackPanel.innerHTML = "";
    dom.nextHint.textContent = questionContent.storyOnlyHint;
    dom.nextHint.classList.remove("is-hidden");
    dom.nextButton.textContent = questionContent.buttons.storyOnly;
    dom.nextButton.disabled = true;
    if (shouldResetStageScroll) {
      dom.questionStage.scrollTop = 0;
    }
    lastRenderedQuestionIndex = currentIndex;
    syncGamification();
    return;
  }

  const selectedAnswer = selectedAnswers[currentIndex];
  const validatedAnswer = validatedAnswers[currentIndex];
  const answeredCorrectly = validatedAnswer !== null && validatedAnswer === question.answer;
  const isAutoAdvancing = answeredCorrectly && !isSubmitted && isAutoAdvancePendingForCurrentQuestion();
  const isAwaitingAnswerSync = pendingAnswerQuestionIndex === currentIndex;
  const isMissionTransitionReady = !isSubmitted && validatedAnswer !== null && !allQuestionsAnswered() && shouldAdvanceToNextMission();
  const isLocked = validatedAnswer !== null || isSubmitted;

  dom.questionCounter.textContent = formatTemplate(questionContent.counter, {
    current: question.id,
    total: totalQuestions(),
  });
  dom.questionPrompt.textContent = question.prompt;

  if (question.stimulus) {
    dom.questionStimulus.textContent = question.stimulus;
    dom.questionStimulus.classList.remove("is-hidden");
  } else {
    dom.questionStimulus.textContent = "";
    dom.questionStimulus.classList.add("is-hidden");
  }

  dom.optionsList.innerHTML = "";

  question.options.forEach((option, optionIndex) => {
    const item = document.createElement("li");
    item.className = "options-list-item";

    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";

    if (selectedAnswer === optionIndex) {
      button.classList.add("is-selected");
    }

    if (validatedAnswer !== null) {
      if (optionIndex === question.answer) {
        button.classList.add("is-correct");
      } else if (validatedAnswer === optionIndex) {
        button.classList.add("is-wrong");
      }
    }

    const letter = String.fromCharCode(65 + optionIndex);
    const shouldShowRationale =
      validatedAnswer !== null &&
      validatedAnswer !== question.answer &&
      optionIndex === question.answer;
    button.innerHTML = `
      <span class="option-inner">
        <span class="option-letter">${letter}</span>
        <span class="option-copy">
          <span class="option-text">${escapeHtml(option)}</span>
          ${
            shouldShowRationale
              ? `<span class="option-rationale"><span class="option-rationale-label">${escapeHtml(questionContent.feedback.why)}</span> ${escapeHtml(question.explanation)}</span>`
              : ""
          }
        </span>
      </span>
    `;
    button.disabled = isLocked;

    if (!isLocked) {
      button.addEventListener("click", () => {
        selectedAnswers[currentIndex] = optionIndex;
        renderQuestion();
      });
    }

    item.appendChild(button);
    dom.optionsList.appendChild(item);
  });

  renderFeedback(question, validatedAnswer);

  if (isSubmitted) {
    dom.nextHint.classList.add("is-hidden");
  } else if (validatedAnswer === null) {
    dom.nextHint.textContent =
      selectedAnswer === null
        ? questionContent.selectHint
        : questionContent.validateHint;
    dom.nextHint.classList.remove("is-hidden");
  } else if (allQuestionsAnswered()) {
    dom.nextHint.textContent = formatTemplate(questionContent.allAnsweredHint, {
      count: totalQuestions(),
    });
    dom.nextHint.classList.remove("is-hidden");
  } else {
    dom.nextHint.textContent = isAutoAdvancing
      ? questionContent.autoAdvanceHint
      : isAwaitingAnswerSync
        ? "Mission Control is checking that answer..."
      : isMissionTransitionReady
        ? (questionContent.nextMissionHint || "Rocket part secured. Press Next mission.")
        : questionContent.lockedHint;
    dom.nextHint.classList.remove("is-hidden");
  }

  dom.nextButton.textContent = isSubmitted
    ? currentIndex === totalQuestions() - 1
      ? questionContent.buttons.finished
      : questionContent.buttons.next
    : validatedAnswer === null
      ? questionContent.buttons.check
    : allQuestionsAnswered()
      ? questionContent.buttons.launch
      : isMissionTransitionReady
        ? (questionContent.buttons.nextMission || "Next mission")
        : questionContent.buttons.next;
  dom.nextButton.disabled =
    isAutoAdvancing ||
    isAwaitingAnswerSync ||
    (!isSubmitted && validatedAnswer === null && selectedAnswer === null) ||
    (isSubmitted && currentIndex === totalQuestions() - 1);
  if (shouldResetStageScroll) {
    dom.questionStage.scrollTop = 0;
  }
  lastRenderedQuestionIndex = currentIndex;
  syncGamification();
}

function scoreQuestions() {
  let correct = 0;
  const sectionScores = {};
  const missed = [];

  for (const section of sections) {
    sectionScores[section] = { correct: 0, total: 0 };
  }

  sessionQuestions.forEach((question, index) => {
    const chosen = validatedAnswers[index];
    const isCorrect = chosen === question.answer;
    sectionScores[question.section].total += 1;

    if (isCorrect) {
      correct += 1;
      sectionScores[question.section].correct += 1;
      return;
    }

    missed.push({
      question,
      chosen,
    });
  });

  return {
    correct,
    missed,
    sectionScores,
  };
}

function summaryText(percentage) {
  const band =
    resultsContent.summaryBands.find((entry) => percentage >= entry.min) ||
    resultsContent.summaryBands[resultsContent.summaryBands.length - 1];
  return band.text;
}

function renderResults() {
  const { correct, missed, sectionScores } = scoreQuestions();
  const percentage = scorePercent(correct);
  dom.resultsSection.classList.remove("is-hidden");
  dom.reviewDetails.open = false;
  if (isStoryOnlySession) {
    dom.scoreHeadline.textContent = formatTemplate(resultsContent.storyOnlyHeadline, {
      name: playerName || "Explorer",
    });
    dom.scoreSummary.textContent = resultsContent.storyOnlySummary;
    dom.timeSummary.textContent = resultsContent.storyOnlyTimeSummary;
  } else {
    dom.scoreHeadline.textContent = playerName
      ? `${playerName} powered ${correct}/${totalQuestions()} mission steps (${percentage}%)`
      : `You powered ${correct}/${totalQuestions()} mission steps (${percentage}%)`;
    dom.scoreSummary.textContent = `${summaryText(percentage)} ${resultsContent.summarySuffix}`;
    dom.timeSummary.textContent = formatTemplate(resultsContent.timeSummary, {
      used: formatTime(testDurationSeconds() - timeRemaining),
      total: formatTime(testDurationSeconds()),
    });
  }
  renderEndingStory(percentage);

  renderResultsGallery(percentage, sectionScores);

  dom.reviewList.innerHTML = "";
  if (missed.length === 0) {
    const card = document.createElement("div");
    card.className = "review-card";
    card.innerHTML = `
      <h4>${resultsContent.perfectTitle}</h4>
      <p>${resultsContent.perfectBody}</p>
    `;
    dom.reviewList.appendChild(card);
    return;
  }

  missed.forEach(({ question, chosen }) => {
    const card = document.createElement("div");
    card.className = "review-card";
    const mission = missionStoryForSection(question.section);
    const chosenText =
      chosen === null ? questionContent.feedback.noAnswer : question.options[chosen];
    card.innerHTML = `
      <h4>${mission ? `Mission ${mission.number}: ${mission.title}` : question.section} - Step ${question.id}</h4>
      <p>${question.prompt}</p>
      ${question.stimulus ? `<pre class="question-stimulus">${question.stimulus}</pre>` : ""}
      <div class="review-meta">
        <span><strong>${questionContent.feedback.yourAnswer}</strong> ${chosenText}</span>
        <span><strong>${questionContent.feedback.correctAnswer}</strong> ${question.options[question.answer]}</span>
        <span><strong>${questionContent.feedback.why}</strong> ${question.explanation}</span>
      </div>
    `;
    dom.reviewList.appendChild(card);
  });
}

function buildFinalScoreRecord() {
  const { correct } = scoreQuestions();
  return {
    playerName,
    score: correct,
    percentage: scorePercent(correct),
    totalQuestions: totalQuestions(),
    elapsedSeconds: elapsedMissionSeconds(),
    clientType: "web",
    mode: isStoryOnlySession ? "story" : "quiz",
  };
}

function buildLiveScoreRecord() {
  const correct = liveCorrectTotal();
  return {
    playerName,
    score: correct,
    percentage: scorePercent(correct),
    totalQuestions: totalQuestions(),
    elapsedSeconds: elapsedMissionSeconds(),
    clientType: "web",
    mode: isStoryOnlySession ? "story" : "quiz",
  };
}

function buildAttemptQuestionRegistration() {
  return sessionQuestions.map((question) => ({
    questionId: question.id,
    bankId: question.bankId,
    options: [...question.options],
  }));
}

function startTestFromBeginning() {
  if (hasStarted || !playerName || isStartingAttempt) {
    return;
  }

  currentIndex = 0;
  isStoryOnlySession = storyOnlyModeEnabled;
  const isQuizSession = !isStoryOnlySession;

  function beginSessionWithQuestions(questions) {
    if (Array.isArray(questions) && questions.length > 0) {
      applyAttemptQuestions(questions);
    }

    hasStarted = true;
    isStartingAttempt = false;
    if (isStoryOnlySession) {
      clearTimer();
      setTimerPaused(true);
      updateTimerDisplay();
    } else {
      startTimer();
    }

    renderQuestion();
  }

  if (isStoryOnlySession) {
    beginSessionWithQuestions([]);
    return;
  }

  if (scoreboardController && isQuizSession) {
    isStartingAttempt = true;
    dom.nextHint.textContent = "Preparing mission steps...";
    dom.nextHint.classList.remove("is-hidden");
    dom.nextButton.disabled = true;
    scoreboardController
      .beginAttempt({
        playerName,
        clientType: "web",
        mode: "quiz",
      })
      .then((result) => {
        beginSessionWithQuestions(result?.questions ?? []);
      })
      .catch((error) => {
        reportAsyncMissionError("Attempt start failed.", error);
        beginSessionWithQuestions([]);
      });

    return;
  }

  beginSessionWithQuestions([]);
}

function restartTest() {
  clearTimer();
  clearPendingAutoAdvance();
  deferredAdvanceQuestionIndex = -1;
  isTimerPaused = false;
  if (gamificationController) {
    gamificationController.reset();
  }
  createNewSession();
  playerName = "";
  dom.childNameInput.value = "";
  if (scoreboardController) {
    scoreboardController.setActivePlayerName(playerName);
  }
  dom.parentArea.open = false;
  dom.reviewDetails.open = false;
  dom.resultsSection.classList.add("is-hidden");
  dom.timeSummary.textContent = "";
  updateProgress();
  updateTimerDisplay();
  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function clearTransientGamificationUi() {
  if (gamificationController && typeof gamificationController.clearTransientFeedback === "function") {
    gamificationController.clearTransientFeedback();
  }
}

function reportAsyncMissionError(context, error) {
  console.error(`[CaptainNova] ${context}`, error);
}

function submitTest() {
  if (isSubmitted) {
    return;
  }

  clearPendingAutoAdvance();
  deferredAdvanceQuestionIndex = -1;
  isTimerPaused = false;
  isSubmitted = true;
  clearTimer();
  renderQuestion();
  renderResults();
  if (gamificationController) {
    gamificationController.onTestCompleted(buildGamificationSnapshot());
  }
  if (scoreboardController && !isStoryOnlySession) {
    scoreboardController
      .finalizeAttempt({
        elapsedSeconds: elapsedMissionSeconds(),
      })
      .catch((error) => {
        reportAsyncMissionError("Attempt finalization failed.", error);
      });
  }
  dom.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function handleOverlayStateChange(overlayState) {
  const hasBlockingOverlay = Boolean(overlayState && overlayState.hasBlocking);
  const dismissedEvent = overlayState?.dismissedEvent || null;
  setTimerPaused(hasBlockingOverlay && hasStarted && !isSubmitted);

  if (!hasBlockingOverlay && isStoryOnlySession && !isSubmitted) {
    if (dismissedEvent?.variant === "intro") {
      gamificationController?.showMissionUpdate(dismissedEvent.sectionKey);
      return;
    }

    if (dismissedEvent?.variant === "midpoint") {
      gamificationController?.showMissionCompletion(dismissedEvent.sectionKey);
      return;
    }

    if (dismissedEvent?.variant === "section") {
      completeSectionInStoryOnly(dismissedEvent.sectionKey);
      advanceToNextMissionStep({ preferNextMission: true });
      return;
    }
  }

  if (
    !hasBlockingOverlay &&
    dismissedEvent?.variant === "section" &&
    dismissedEvent.advanceOnDismiss !== false
  ) {
    advanceToNextMissionStep({ preferNextMission: true });
    return;
  }

  if (
    !hasBlockingOverlay &&
    dismissedEvent?.variant === "section" &&
    dismissedEvent.advanceOnDismiss === false
  ) {
    suppressNextButtonUntil = Date.now() + 300;
    renderQuestion();
    return;
  }

  if (
    !hasBlockingOverlay &&
    deferredAdvanceQuestionIndex !== -1 &&
    deferredAdvanceQuestionIndex === currentIndex &&
    validatedAnswers[currentIndex] === questionAt(currentIndex)?.answer
  ) {
    scheduleAutoAdvance(currentIndex);
    renderQuestion();
  }
}

dom.nextButton.addEventListener("click", () => {
  if (Date.now() < suppressNextButtonUntil) {
    return;
  }

  if (isStoryOnlySession) {
    return;
  }

  const selectedAnswer = selectedAnswers[currentIndex];
  const validatedAnswer = validatedAnswers[currentIndex];
  const question = questionAt(currentIndex);

  if (!isSubmitted && validatedAnswer === null) {
    if (selectedAnswer === null) {
      return;
    }

    const questionIndex = currentIndex;
    validatedAnswers[currentIndex] = selectedAnswer;
    pendingAnswerQuestionIndex = questionIndex;
    updateProgress();
    renderQuestion();
    const handleAnswerEvaluation = (result) => {
      if (questionAt(questionIndex)) {
        const authoritativeCorrectAnswer =
          Number.isInteger(result?.correctAnswer) && result.correctAnswer >= 0 && result.correctAnswer <= 3
            ? result.correctAnswer
            : question.answer;
        sessionQuestions[questionIndex].answer = authoritativeCorrectAnswer;
        const isCorrect = typeof result?.isCorrect === "boolean"
          ? result.isCorrect
          : selectedAnswer === authoritativeCorrectAnswer;

        if (gamificationController) {
          gamificationController.onAnswerEvaluated(buildGamificationSnapshot(), {
            questionId: question.id,
            section: question.section,
            isCorrect,
          });
        }

        if (isCorrect) {
          if (gamificationController && gamificationController.hasBlockingOverlay()) {
            deferredAdvanceQuestionIndex = questionIndex;
          } else {
            scheduleAutoAdvance(questionIndex);
          }
        }
      }

      if (pendingAnswerQuestionIndex === questionIndex) {
        pendingAnswerQuestionIndex = -1;
      }
      renderQuestion();
    };

    if (scoreboardController) {
      scoreboardController
        .recordValidatedAnswer({
          playerName,
          clientType: "web",
          mode: isStoryOnlySession ? "story" : "quiz",
          sessionQuestions: buildAttemptQuestionRegistration(),
          questionId: question.id,
          bankId: question.bankId,
          selectedAnswer,
          elapsedSeconds: elapsedMissionSeconds(),
        })
        .then(handleAnswerEvaluation)
        .catch((error) => {
          if (pendingAnswerQuestionIndex === questionIndex) {
            pendingAnswerQuestionIndex = -1;
          }
          reportAsyncMissionError("Attempt answer sync failed.", error);
          handleAnswerEvaluation(null);
        });
    } else {
      handleAnswerEvaluation(null);
    }
    return;
  }

  advanceToNextMissionStep();
});

dom.restartButton.addEventListener("click", restartTest);
dom.retryButton.addEventListener("click", restartTest);
dom.storyOnlyToggle.addEventListener("change", () => {
  storyOnlyModeEnabled = dom.storyOnlyToggle.checked;
  renderQuestion();
});
dom.childNameInput.addEventListener("input", () => {
  playerName = dom.childNameInput.value.trim().replace(/\s+/g, " ");
  if (scoreboardController) {
    scoreboardController.setActivePlayerName(playerName);
  }
  renderQuestion();
});
dom.childNameInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  dom.childNameInput.blur();
  startTestFromBeginning();
});
dom.backToQuestionsButton.addEventListener("click", () => {
  dom.questionPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

if (window.GiftedGamification) {
  gamificationController = window.GiftedGamification.createGamificationController({
    themeId: "rocketAdventure",
    roots: {
      hudRoot: dom.gamificationHud,
      sectionProgressRoot: dom.sectionProgressRoot,
      overallProgressRoot: dom.overallProgressRoot,
      rocketProgressRoot: dom.rocketProgressRoot,
      questionFeedbackRoot: dom.questionFeedbackRoot,
      questionPanel: dom.questionPanel,
      overlayRoot: dom.gamificationOverlayRoot,
    },
    callbacks: {
      onOverlayStateChange: handleOverlayStateChange,
    },
  });
}

if (window.GiftedScoreboard) {
  scoreboardController = window.GiftedScoreboard.createScoreboardController({
    elements: {
      name: dom.leaderboardName,
      score: dom.leaderboardScore,
      status: dom.leaderboardStatus,
      resetButton: dom.resetScoresButton,
    },
  });
  scoreboardController.init();
  scoreboardController.setActivePlayerName(playerName);
}

createNewSession();
applyStaticCopy();
dom.storyOnlyToggle.checked = storyOnlyModeEnabled;
updateProgress();
updateTimerDisplay();
renderQuestion();
