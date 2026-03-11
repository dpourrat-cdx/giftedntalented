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

const storyContent = Object.freeze({
  title: "Captain Nova's Rocket Mission",
  introduction: {
    kicker: "Introduction",
    text: [
      "Welcome, Explorer! Mission Control has an important assignment for you.",
      "Captain Nova is preparing a rocket to explore a mysterious new planet far beyond Earth.",
      "But the rocket is not built yet, and only a brilliant young engineer can assemble it.",
      "Eight missions stand between you and liftoff.",
      "Each mission unlocks a new part of the rocket.",
      "Complete them all, and we launch for the stars!",
    ],
  },
  missions: [
    {
      section: "Verbal",
      number: 1,
      title: "Verbal Challenge",
      rocketPart: "Rocket Base",
      text: [
        "Captain Nova enters the first chamber of the space station.",
        "Glowing words float in the air, hiding the foundation of the rocket.",
        "Choose the right words to unlock the rocket base and start building the ship.",
      ],
    },
    {
      section: "Math",
      number: 2,
      title: "Math Challenge",
      rocketPart: "Rocket Body",
      text: [
        "With the base secured, Captain Nova moves into the Number Chamber.",
        "Floating numbers spin slowly around the room.",
        "Solve the math puzzle to reveal the rocket body and connect it to the base.",
      ],
    },
    {
      section: "Nonverbal",
      number: 3,
      title: "Pattern Vision",
      rocketPart: "Rocket Window",
      text: [
        "In the next room, there are no words and no numbers.",
        "Only shapes and pictures form a mysterious pattern on the walls.",
        "Find the pattern to unlock the bright window that will let Captain Nova see the stars.",
      ],
    },
    {
      section: "Spatial",
      number: 4,
      title: "Spatial Assembly",
      rocketPart: "Rocket Wings",
      text: [
        "The rocket now needs wings to travel safely through the sky.",
        "Pieces of metal float around like a puzzle waiting to be assembled.",
        "Fit them together correctly and the rocket wings unfold into place.",
      ],
    },
    {
      section: "Patterns",
      number: 5,
      title: "Pattern Reactor",
      rocketPart: "Rocket Engine",
      text: [
        "Deep inside the station, glowing symbols pulse with energy.",
        "They form a repeating pattern that controls the rocket engine.",
        "Find the missing symbol and the powerful engine will activate.",
      ],
    },
    {
      section: "Analogies",
      number: 6,
      title: "Analogy Link",
      rocketPart: "Astronaut Seat",
      text: [
        "Captain Nova reaches the control room.",
        "Two ideas appear on the main screen, connected in a special way.",
        "Solve the analogy to unlock the astronaut seat inside the rocket.",
      ],
    },
    {
      section: "Categories",
      number: 7,
      title: "Sorting Protocol",
      rocketPart: "Launch Flames",
      text: [
        "The rocket is nearly ready.",
        "Different objects float through the air, but only some belong together.",
        "Sort them correctly and bright launch flames ignite beneath the rocket.",
      ],
    },
    {
      section: "Logic",
      number: 8,
      title: "Final Logic System",
      rocketPart: "Launch Glow",
      text: [
        "Only one system remains before liftoff.",
        "A series of clues guards the final launch control.",
        "Solve the logic puzzle and the rocket begins to glow, fully ready for launch.",
      ],
    },
  ],
  endings: [
    {
      id: "ending_95_plus",
      label: "Legendary Launch",
      minScore: 95,
      maxScore: 100,
      text: [
        "Captain Nova climbs into the astronaut seat and begins the countdown.",
        "Every rocket system works perfectly.",
        "The engines ignite with a thunderous roar and the rocket blasts into space.",
        "It races past the Moon and flies toward worlds no explorer has ever seen.",
        "Bright comets, strange planets, and sparkling galaxies appear outside the window.",
        "Thanks to your incredible work, this mission becomes a legendary space adventure.",
      ],
    },
    {
      id: "ending_85_94",
      label: "Strong Mission",
      minScore: 85,
      maxScore: 94,
      text: [
        "The engines roar and the rocket launches smoothly into the sky.",
        "Captain Nova reaches space and begins exploring among the stars.",
        "Most rocket systems work well, though a few parts are not perfectly tuned.",
        "Because of this, the rocket cannot travel quite as far as planned.",
        "Even so, the mission is exciting and successful.",
        "With just a little more precision, the next rocket could reach even deeper space.",
      ],
    },
    {
      id: "ending_75_84",
      label: "Early Return",
      minScore: 75,
      maxScore: 84,
      text: [
        "The rocket lifts off and climbs high above Earth.",
        "Captain Nova reaches space and sees distant planets glowing in the darkness.",
        "However, some rocket parts are not working at full power.",
        "The engines cannot push the ship deeper into the solar system.",
        "Mission Control asks Captain Nova to return earlier than planned.",
        "With better answers during the missions, the next rocket could travel much farther.",
      ],
    },
    {
      id: "ending_60_74",
      label: "Edge of Space",
      minScore: 60,
      maxScore: 74,
      text: [
        "The rocket shakes as it launches, but Captain Nova manages to guide it upward.",
        "Soon the rocket reaches the edge of space and Earth shines below like a blue marble.",
        "Several systems struggle to keep the rocket flying smoothly.",
        "The engines cannot maintain full power for long.",
        "Mission Control orders an early return to keep everyone safe.",
        "Stronger solutions in the missions would have built a much better rocket.",
      ],
    },
    {
      id: "ending_below_60",
      label: "Launch Attempt",
      minScore: 0,
      maxScore: 59,
      text: [
        "Captain Nova starts the engines, but something is clearly wrong.",
        "The rocket rises only a short distance before warning lights begin flashing.",
        "Several important rocket parts were not built correctly.",
        "Captain Nova carefully brings the rocket back to the launch pad.",
        "This mission cannot reach space today.",
        "But with better problem solving, the next rocket could be powerful enough to reach the stars.",
      ],
    },
  ],
});

const dom = {
  answeredCount: document.getElementById("answeredCount"),
  progressFill: document.getElementById("progressFill"),
  sectionStats: document.getElementById("sectionStats"),
  gamificationHud: document.getElementById("gamificationHud"),
  sectionProgressRoot: document.getElementById("sectionProgressRoot"),
  overallProgressRoot: document.getElementById("overallProgressRoot"),
  rocketProgressRoot: document.getElementById("rocketProgressRoot"),
  questionFeedbackRoot: document.getElementById("questionFeedbackRoot"),
  gamificationOverlayRoot: document.getElementById("gamificationOverlayRoot"),
  nameEntry: document.getElementById("nameEntry"),
  childNameInput: document.getElementById("childNameInput"),
  nameHint: document.getElementById("nameHint"),
  playerNote: document.getElementById("playerNote"),
  storyPanel: document.getElementById("storyPanel"),
  leaderboardName: document.getElementById("leaderboardName"),
  leaderboardScore: document.getElementById("leaderboardScore"),
  leaderboardStatus: document.getElementById("leaderboardStatus"),
  resetScoresButton: document.getElementById("resetScoresButton"),
  timerDisplay: document.getElementById("timerDisplay"),
  scoreDisplay: document.getElementById("scoreDisplay"),
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
  scoreHeadline: document.getElementById("scoreHeadline"),
  scoreSummary: document.getElementById("scoreSummary"),
  timeSummary: document.getElementById("timeSummary"),
  endingStory: document.getElementById("endingStory"),
  resultsBreakdown: document.getElementById("resultsBreakdown"),
  retryButton: document.getElementById("retryButton"),
  backToQuestionsButton: document.getElementById("backToQuestionsButton"),
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
    dom.storyPanel.innerHTML = "";
    return;
  }

  const pills = [];
  if (content.pill) {
    pills.push(`<span class="story-pill">${escapeHtml(content.pill)}</span>`);
  }
  if (content.secondaryPill) {
    pills.push(`<span class="story-pill">${escapeHtml(content.secondaryPill)}</span>`);
  }

  dom.storyPanel.innerHTML = `
    <p class="story-kicker">${escapeHtml(content.kicker)}</p>
    <h3>${escapeHtml(content.title)}</h3>
    ${pills.length ? `<div class="story-pills">${pills.join("")}</div>` : ""}
    <div class="story-copy">
      ${buildStoryParagraphs(content.lines)}
    </div>
  `;
}

function renderIntroductionStory() {
  renderStoryPanel({
    kicker: storyContent.introduction.kicker,
    title: storyContent.title,
    pill: "8 Missions to Build the Rocket",
    secondaryPill: "Captain Nova Needs You",
    lines: storyContent.introduction.text,
  });
}

function renderMissionStory(section) {
  const mission = missionStoryForSection(section);
  if (!mission) {
    dom.storyPanel.innerHTML = "";
    return;
  }

  renderStoryPanel({
    kicker: `Mission ${mission.number}`,
    title: mission.title,
    pill: `Unlock: ${mission.rocketPart}`,
    secondaryPill: section,
    lines: mission.text,
  });
}

function renderEndingStory(percentage) {
  const ending = endingStoryForPercentage(percentage);
  dom.endingStory.innerHTML = `
    <p class="story-kicker">${escapeHtml(ending.label)}</p>
    <h3>Captain Nova's Final Flight</h3>
    <div class="story-pills">
      <span class="story-pill">${escapeHtml(`${percentage}% mission score`)}</span>
      <span class="story-pill">Mission Complete</span>
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

  const reward = missionRewardForIndex(sectionIndex);
  dom.sectionBadge.innerHTML = `
    <span class="mission-badge-icon reward-${reward.key}" aria-hidden="true">
      ${missionRewardSvg(reward.key)}
    </span>
    <span>${label}</span>
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
        <strong>${section}</strong>
        <span>${mission ? mission.title : titleCase(reward.label)}</span>
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
  dom.answeredCount.textContent = `${totalAnswered} / ${totalQuestions()}`;
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
    ? `<strong>Correct</strong><span>${question.explanation}</span>`
    : `<strong>Not quite</strong><span>Correct answer: ${correctAnswer}. ${question.explanation}</span>`;
}

function renderQuestion() {
  renderSectionStats();

  if (!hasStarted) {
    dom.questionPanel.classList.add("is-start-screen");
    dom.nameEntry.classList.remove("is-hidden");
    dom.playerNote.classList.add("is-hidden");
    dom.sectionBadge.textContent = "Mission Briefing";
    dom.questionCounter.textContent = `${totalQuestions()} questions across ${sections.length} missions`;
    dom.questionPrompt.textContent = playerName
      ? `Hi ${playerName}! Captain Nova is ready for launch.`
      : "Type your name to join Captain Nova's mission.";
    dom.questionStimulus.textContent = "";
    dom.questionStimulus.classList.add("is-hidden");
    dom.optionsList.innerHTML = "";
    dom.feedbackPanel.className = "feedback-panel is-hidden";
    dom.feedbackPanel.innerHTML = "";
    renderIntroductionStory();
    dom.nameHint.textContent = playerName
      ? "Press Enter to begin the first mission."
      : "Mission Control needs your name first.";
    dom.nextHint.textContent = playerName
      ? "The first mission is Verbal Challenge. Press Enter when you are ready."
      : "Type your name to begin the mission.";
    dom.nextHint.classList.remove("is-hidden");
    dom.nextButton.textContent = "Validate";
    dom.nextButton.disabled = true;
    syncGamification();
    return;
  }

  dom.questionPanel.classList.remove("is-start-screen");
  dom.nameEntry.classList.add("is-hidden");
  const question = questionAt(currentIndex);
  const mission = missionStoryForSection(question.section);
  dom.playerNote.textContent = mission
    ? `Playing as ${playerName}. Captain Nova is on Mission ${mission.number}.`
    : `Playing as ${playerName}.`;
  dom.playerNote.classList.remove("is-hidden");
  renderMissionStory(question.section);
  const selectedAnswer = selectedAnswers[currentIndex];
  const validatedAnswer = validatedAnswers[currentIndex];
  const isLocked = validatedAnswer !== null || isSubmitted;

  setSectionBadgeContent(question.section);
  dom.questionCounter.textContent = `Question ${question.id} of ${totalQuestions()}`;
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
        ? "Pick one answer to unlock Validate."
        : "Click Validate to check this answer.";
    dom.nextHint.classList.remove("is-hidden");
  } else if (allQuestionsAnswered()) {
    dom.nextHint.textContent = "All 64 questions are done. Open the results when you're ready.";
    dom.nextHint.classList.remove("is-hidden");
  } else {
    dom.nextHint.textContent = "This answer is locked. Click Continue for the next unanswered question.";
    dom.nextHint.classList.remove("is-hidden");
  }

  dom.nextButton.textContent = isSubmitted
    ? currentIndex === totalQuestions() - 1
      ? "Finished"
      : "Continue"
    : validatedAnswer === null
      ? "Validate"
      : allQuestionsAnswered()
        ? "See Results"
        : "Continue";
  dom.nextButton.disabled =
    (!isSubmitted && validatedAnswer === null && selectedAnswer === null) ||
    (isSubmitted && currentIndex === totalQuestions() - 1);
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
  if (percentage >= 85) {
    return "Excellent practice result. Strong readiness across multiple reasoning areas.";
  }

  if (percentage >= 70) {
    return "Strong practice result. Review missed questions and repeat with a fresh random set.";
  }

  if (percentage >= 55) {
    return "Solid start. Focus on one or two sections at a time and build confidence through repetition.";
  }

  return "Useful baseline. Review slowly, talk through the explanations, and practice a little each day.";
}

function renderResults() {
  const { correct, missed, sectionScores } = scoreQuestions();
  const percentage = scorePercent(correct);
  dom.resultsSection.classList.remove("is-hidden");
  dom.scoreHeadline.textContent = playerName
    ? `${playerName} scored ${correct}/${totalQuestions()} (${percentage}%)`
    : `You scored ${correct}/${totalQuestions()} (${percentage}%)`;
  dom.scoreSummary.textContent = `${summaryText(percentage)} Captain Nova's mission report is below.`;
  dom.timeSummary.textContent = `Time used: ${formatTime(testDurationSeconds() - timeRemaining)} of ${formatTime(testDurationSeconds())}.`;
  renderEndingStory(percentage);

  dom.resultsBreakdown.innerHTML = "";
  for (const section of sections) {
    const { correct: sectionCorrect, total } = sectionScores[section];
    const card = document.createElement("div");
    card.className = "breakdown-card";
    card.innerHTML = `
      <strong>${section}</strong>
      <span>${sectionCorrect} correct out of ${total}</span>
      <span>${scorePercent(sectionCorrect, total)}% in this section</span>
    `;
    dom.resultsBreakdown.appendChild(card);
  }

  dom.reviewList.innerHTML = "";
  if (missed.length === 0) {
    const card = document.createElement("div");
    card.className = "review-card";
    card.innerHTML = `
      <h4>Perfect score</h4>
      <p>No missed questions in this 64-question test.</p>
    `;
    dom.reviewList.appendChild(card);
    return;
  }

  missed.forEach(({ question, chosen }) => {
    const card = document.createElement("div");
    card.className = "review-card";
    const chosenText = chosen === null ? "No answer selected" : question.options[chosen];
    card.innerHTML = `
      <h4>Question ${question.id}: ${question.section}</h4>
      <p>${question.prompt}</p>
      ${question.stimulus ? `<pre class="question-stimulus">${question.stimulus}</pre>` : ""}
      <div class="review-meta">
        <span><strong>Your answer:</strong> ${chosenText}</span>
        <span><strong>Correct answer:</strong> ${question.options[question.answer]}</span>
        <span><strong>Why:</strong> ${question.explanation}</span>
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
  window.scrollTo({ top: 0, behavior: "smooth" });
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
updateProgress();
updateTimerDisplay();
renderQuestion();
