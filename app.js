const {
  SECTIONS: sections,
  QUESTIONS_PER_TEST_SECTION,
  buildTestSession,
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
  buildNote: document.getElementById("buildNote"),
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
  briefingKicker: document.getElementById("briefingKicker"),
  storyPanel: document.getElementById("storyPanel"),
  questionStage: document.getElementById("questionStage"),
  leaderboardName: document.getElementById("leaderboardName"),
  leaderboardScore: document.getElementById("leaderboardScore"),
  leaderboardStatus: document.getElementById("leaderboardStatus"),
  parentArea: document.getElementById("parentArea"),
  parentAreaToggle: document.getElementById("parentAreaToggle"),
  parentAreaKicker: document.getElementById("parentAreaKicker"),
  parentAreaCopy: document.getElementById("parentAreaCopy"),
  resetScoresButton: document.getElementById("resetScoresButton"),
  timerLabel: document.getElementById("timerLabel"),
  timerDisplay: document.getElementById("timerDisplay"),
  scoreLabel: document.getElementById("scoreLabel"),
  scoreDisplay: document.getElementById("scoreDisplay"),
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

  gamificationController.sync(buildGamificationSnapshot());
}

function testDurationSeconds() {
  return totalQuestions() * 30;
}

function createNewSession() {
  sessionQuestions = buildTestSession();
  selectedAnswers = Array(totalQuestions()).fill(null);
  validatedAnswers = Array(totalQuestions()).fill(null);
  currentIndex = 0;
  timeRemaining = testDurationSeconds();
  isSubmitted = false;
  hasStarted = false;
  lastRenderedQuestionIndex = -1;
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

function updateTimerDisplay() {
  dom.timerDisplay.textContent = formatTime(timeRemaining);
}

function clearTimer() {
  if (timerId) {
    window.clearInterval(timerId);
    timerId = null;
  }
}

function startTimer() {
  clearTimer();
  timerId = window.setInterval(() => {
    if (isSubmitted) {
      clearTimer();
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

function nextUnansweredIndexAfterCurrent() {
  for (let index = currentIndex + 1; index < totalQuestions(); index += 1) {
    if (validatedAnswers[index] === null) {
      return index;
    }
  }

  return firstUnansweredIndex();
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
  dom.restartButton.textContent = parentAreaContent.restart;
  dom.resetScoresButton.textContent = parentAreaContent.reset;

  dom.buildKicker.textContent = dashboardContent.buildTitle;
  dom.timerLabel.textContent = dashboardContent.timerLabel;
  dom.scoreLabel.textContent = dashboardContent.scoreLabel;
  dom.buildNote.textContent = dashboardContent.buildNote;
  dom.missionsKicker.textContent = dashboardContent.missionsTitle;
  dom.tipKicker.textContent = dashboardContent.tipTitle;
  dom.tipCopy.textContent = dashboardContent.tipCopy;

  dom.briefingKicker.textContent = startContent.briefingTitle;
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

function buildStoryParagraphs(lines) {
  return lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
}

function renderStoryPanel(content) {
  if (!content) {
    dom.storyPanel.className = "story-panel";
    dom.storyPanel.innerHTML = "";
    return;
  }

  dom.storyPanel.className = `story-panel${content.compact ? " is-compact" : ""}`;
  const pills = [];
  if (content.pill) {
    pills.push(`<span class="story-pill">${escapeHtml(content.pill)}</span>`);
  }
  if (content.secondaryPill) {
    pills.push(`<span class="story-pill">${escapeHtml(content.secondaryPill)}</span>`);
  }
  const iconMarkup = content.iconKey
    ? `
      <span class="story-icon reward-${content.iconKey}" aria-hidden="true">
        ${missionRewardSvg(content.iconKey)}
      </span>
    `
    : "";

  dom.storyPanel.innerHTML = `
    <div class="story-heading">
      ${iconMarkup}
      <div class="story-heading-copy">
        <p class="story-kicker">${escapeHtml(content.kicker)}</p>
        <h3>${escapeHtml(content.title)}</h3>
      </div>
    </div>
    ${pills.length ? `<div class="story-pills">${pills.join("")}</div>` : ""}
    <div class="story-copy">${buildStoryParagraphs(content.lines)}</div>
  `;
}

function renderIntroductionStory() {
  renderStoryPanel({
    kicker: storyContent.introduction.kicker,
    title: storyContent.title,
    pill: storyContent.introduction.pill,
    secondaryPill: storyContent.introduction.secondaryPill,
    lines: storyContent.introduction.text,
  });
}

function renderMissionStory(section) {
  const mission = missionStoryForSection(section);
  if (!mission) {
    dom.storyPanel.innerHTML = "";
    return;
  }
  const reward = missionRewardForIndex(mission.number - 1);

  renderStoryPanel({
    kicker: `Mission ${mission.number}`,
    title: mission.title,
    pill: `Unlock: ${mission.rocketPart}`,
    secondaryPill: section,
    lines: [mission.summary],
    compact: true,
    iconKey: reward.key,
  });
}

function renderEndingStory(percentage) {
  const ending = endingStoryForPercentage(percentage);
  dom.endingStory.innerHTML = `
    <p class="story-kicker">${escapeHtml(ending.label)}</p>
    <h3>${escapeHtml(resultsContent.endingTitle)}</h3>
    <div class="story-pills">
      <span class="story-pill">${escapeHtml(formatTemplate(resultsContent.scorePill, { percent: percentage }))}</span>
      <span class="story-pill">${escapeHtml(resultsContent.completePill)}</span>
    </div>
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

function goToSection(section) {
  if (!hasStarted) {
    return;
  }

  currentIndex = firstUnansweredIndexForSection(section);
  renderQuestion();
}

function buildSectionButton(section, isActive, sectionIndex) {
  const reward = missionRewardForIndex(sectionIndex);
  const mission = missionStoryForSection(section);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "section-button";
  button.disabled = !hasStarted;
  button.setAttribute(
    "aria-label",
    mission
      ? `Mission ${mission.number}. ${mission.title}. Unlock ${mission.rocketPart}.`
      : `${section}. Mission reward: ${reward.label}.`,
  );

  if (isActive) {
    button.classList.add("is-active");
  }

  button.innerHTML = `
    <span class="section-button-main">
      <span class="mission-reward-icon reward-${reward.key}" aria-hidden="true">
        ${missionRewardSvg(reward.key)}
      </span>
      <span class="section-button-copy">
        ${mission ? `<span class="section-button-overline">Mission ${mission.number}</span>` : ""}
        <strong>${mission ? mission.title : section}</strong>
        <span>${section}</span>
        <span>Unlock: ${mission ? mission.rocketPart : titleCase(reward.label)}</span>
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
  if (validatedAnswer === null) {
    dom.feedbackPanel.className = "feedback-panel is-hidden";
    dom.feedbackPanel.innerHTML = "";
    return;
  }

  const isCorrect = validatedAnswer === question.answer;
  const correctAnswer = question.options[question.answer];
  dom.feedbackPanel.className = `feedback-panel ${isCorrect ? "is-correct" : "is-wrong"}`;
  dom.feedbackPanel.innerHTML = isCorrect
    ? `<strong>${questionContent.feedback.correctTitle}</strong><span>${question.explanation}</span>`
    : `<strong>${questionContent.feedback.wrongTitle}</strong><span>${questionContent.feedback.correctAnswer} ${correctAnswer}. ${question.explanation}</span>`;
}

function renderQuestion() {
  const shouldResetStageScroll = hasStarted && lastRenderedQuestionIndex !== currentIndex;
  renderSectionStats();

  if (!hasStarted) {
    dom.questionPanel.classList.add("is-start-screen");
    dom.nameEntry.classList.remove("is-hidden");
    dom.playerNote.classList.add("is-hidden");
    dom.sectionBadge.textContent = startContent.badge;
    dom.questionCounter.textContent = formatTemplate(startContent.counter, {
      count: totalQuestions(),
      missions: sections.length,
    });
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
      ? startContent.readyNameHint
      : startContent.emptyNameHint;
    dom.nextHint.textContent = playerName
      ? startContent.readyNextHint
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
  const selectedAnswer = selectedAnswers[currentIndex];
  const validatedAnswer = validatedAnswers[currentIndex];
  const isLocked = validatedAnswer !== null || isSubmitted;

  setSectionBadgeContent(question.section);
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
    button.innerHTML = `<span class="option-letter">${letter}</span>${option}`;
    button.disabled = isLocked;

    if (!isLocked) {
      button.addEventListener("click", () => {
        selectedAnswers[currentIndex] = optionIndex;
        renderQuestion();
      });
    }

    dom.optionsList.appendChild(button);
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
    dom.nextHint.textContent = questionContent.lockedHint;
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
        : questionContent.buttons.next;
  dom.nextButton.disabled =
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
  dom.scoreHeadline.textContent = playerName
    ? `${playerName} powered ${correct}/${totalQuestions()} mission steps (${percentage}%)`
    : `You powered ${correct}/${totalQuestions()} mission steps (${percentage}%)`;
  dom.scoreSummary.textContent = `${summaryText(percentage)} ${resultsContent.summarySuffix}`;
  dom.timeSummary.textContent = formatTemplate(resultsContent.timeSummary, {
    used: formatTime(testDurationSeconds() - timeRemaining),
    total: formatTime(testDurationSeconds()),
  });
  renderEndingStory(percentage);

  dom.resultsBreakdown.innerHTML = "";
  for (const section of sections) {
    const { correct: sectionCorrect, total } = sectionScores[section];
    const mission = missionStoryForSection(section);
    const card = document.createElement("div");
    card.className = "breakdown-card";
    card.innerHTML = `
      <strong>${mission ? `Mission ${mission.number}: ${mission.title}` : section}</strong>
      <span>${formatTemplate(resultsContent.sectionSummary, { correct: sectionCorrect, total })}</span>
      <span>${formatTemplate(resultsContent.sectionPercent, {
        percent: scorePercent(sectionCorrect, total),
      })}</span>
    `;
    dom.resultsBreakdown.appendChild(card);
  }

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
  };
}

function buildLiveScoreRecord() {
  const correct = liveCorrectTotal();
  return {
    playerName,
    score: correct,
    percentage: scorePercent(correct),
    totalQuestions: totalQuestions(),
  };
}

function startTestFromBeginning() {
  if (hasStarted || !playerName) {
    return;
  }

  currentIndex = 0;
  hasStarted = true;
  startTimer();
  renderQuestion();
}

function restartTest() {
  clearTimer();
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

function submitTest() {
  if (isSubmitted) {
    return;
  }

  isSubmitted = true;
  clearTimer();
  renderQuestion();
  renderResults();
  if (gamificationController) {
    gamificationController.onTestCompleted(buildGamificationSnapshot());
  }
  if (scoreboardController) {
    scoreboardController.recordScore(buildFinalScoreRecord());
  }
  dom.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

dom.nextButton.addEventListener("click", () => {
  const selectedAnswer = selectedAnswers[currentIndex];
  const validatedAnswer = validatedAnswers[currentIndex];
  const question = questionAt(currentIndex);

  if (!isSubmitted && validatedAnswer === null) {
    if (selectedAnswer === null) {
      return;
    }

    validatedAnswers[currentIndex] = selectedAnswer;
    updateProgress();
    renderQuestion();
    if (gamificationController) {
      gamificationController.onAnswerEvaluated(buildGamificationSnapshot(), {
        questionId: question.id,
        section: question.section,
        isCorrect: selectedAnswer === question.answer,
      });
    }
    if (scoreboardController) {
      scoreboardController.recordScore(buildLiveScoreRecord());
    }
    return;
  }

  if (!isSubmitted && allQuestionsAnswered()) {
    submitTest();
    return;
  }

  const nextIndex = nextUnansweredIndexAfterCurrent();
  if (nextIndex === -1) {
    submitTest();
    return;
  }

  currentIndex = nextIndex;
  renderQuestion();
});

dom.restartButton.addEventListener("click", restartTest);
dom.retryButton.addEventListener("click", restartTest);
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
updateProgress();
updateTimerDisplay();
renderQuestion();
