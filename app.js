const {
  SECTIONS: sections,
  QUESTIONS_PER_TEST_SECTION,
  buildTestSession,
} = window.GiftedQuestionBank;

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

function goToSection(section) {
  if (!hasStarted) {
    return;
  }

  currentIndex = firstUnansweredIndexForSection(section);
  renderQuestion();
}

function buildSectionButton(section, isActive) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "section-button";
  button.disabled = !hasStarted;

  if (isActive) {
    button.classList.add("is-active");
  }

  button.innerHTML = `<strong>${section}</strong>`;
  button.addEventListener("click", () => goToSection(section));
  return button;
}

function renderSectionStats() {
  dom.sectionStats.innerHTML = "";
  const activeSection = hasStarted ? questionAt(currentIndex).section : "";

  for (const section of sections) {
    const isActive = activeSection === section;
    dom.sectionStats.appendChild(buildSectionButton(section, isActive));
  }
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
    dom.sectionBadge.textContent = playerName ? `Ready, ${playerName}` : "Start Here";
    dom.questionCounter.textContent = `${totalQuestions()} total questions`;
    dom.questionPrompt.textContent = playerName
      ? `Hi ${playerName}! Your test will begin with the first Verbal question.`
      : "Type your name to begin the test.";
    dom.questionStimulus.textContent = "";
    dom.questionStimulus.classList.add("is-hidden");
    dom.optionsList.innerHTML = "";
    dom.feedbackPanel.className = "feedback-panel is-hidden";
    dom.feedbackPanel.innerHTML = "";
    dom.nameHint.textContent = playerName
      ? "Press Enter to begin."
      : "Let's start with your name.";
    dom.nextHint.textContent = playerName
      ? "The test will start with the first Verbal question."
      : "Type your name to begin the test.";
    dom.nextHint.classList.remove("is-hidden");
    dom.nextButton.textContent = "Validate";
    dom.nextButton.disabled = true;
    syncGamification();
    return;
  }

  dom.questionPanel.classList.remove("is-start-screen");
  dom.nameEntry.classList.add("is-hidden");
  dom.playerNote.textContent = `Playing as ${playerName}.`;
  dom.playerNote.classList.remove("is-hidden");

  const question = questionAt(currentIndex);
  const selectedAnswer = selectedAnswers[currentIndex];
  const validatedAnswer = validatedAnswers[currentIndex];
  const isLocked = validatedAnswer !== null || isSubmitted;

  dom.sectionBadge.textContent = question.section;
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
  dom.scoreSummary.textContent = summaryText(percentage);
  dom.timeSummary.textContent = `Time used: ${formatTime(testDurationSeconds() - timeRemaining)} of ${formatTime(testDurationSeconds())}.`;

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
