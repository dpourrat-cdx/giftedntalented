const sections = [
  "Verbal Reasoning",
  "Quantitative Reasoning",
  "Pattern & Spatial",
];

const dom = {
  answeredCount: document.getElementById("answeredCount"),
  progressFill: document.getElementById("progressFill"),
  sectionStats: document.getElementById("sectionStats"),
  timerDisplay: document.getElementById("timerDisplay"),
  scoreDisplay: document.getElementById("scoreDisplay"),
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

let currentIndex = 0;
let answers = [];
let timerId = null;
let isSubmitted = false;

function makeQuestion(section, prompt, options, answer, explanation, stimulus = "") {
  return { section, prompt, options, answer, explanation, stimulus };
}

function verbalQuestions() {
  const section = "Verbal Reasoning";
  return [
    makeQuestion(section, "Bird is to nest as dog is to ...", ["den", "kennel", "bone", "leash"], 1, "A bird lives in a nest. A dog lives in a kennel."),
    makeQuestion(section, "Pencil is to write as scissors are to ...", ["cut", "paint", "erase", "glue"], 0, "A pencil writes. Scissors cut."),
    makeQuestion(section, "Kitten is to cat as puppy is to ...", ["wolf", "dog", "pet", "fur"], 1, "A kitten grows into a cat. A puppy grows into a dog."),
    makeQuestion(section, "Leaf is to tree as petal is to ...", ["seed", "flower", "garden", "stem"], 1, "A leaf is part of a tree. A petal is part of a flower."),
    makeQuestion(section, "Hot is to cold as day is to ...", ["sun", "night", "light", "clock"], 1, "Hot and cold are opposites, just like day and night."),
    makeQuestion(section, "Eye is to see as ear is to ...", ["hear", "smell", "touch", "blink"], 0, "Eyes see. Ears hear."),
    makeQuestion(section, "Bee is to hive as ant is to ...", ["web", "nest", "hill", "tree"], 2, "Bees live in hives. Ants live in hills."),
    makeQuestion(section, "Author is to book as artist is to ...", ["painting", "brush", "museum", "music"], 0, "An author creates a book. An artist creates a painting."),
    makeQuestion(section, "Spoon is to soup as straw is to ...", ["plate", "juice", "cup", "cookie"], 1, "A spoon is used with soup. A straw is used with juice."),
    makeQuestion(section, "Clock is to time as thermometer is to ...", ["weather", "temperature", "wind", "season"], 1, "A clock measures time. A thermometer measures temperature."),
    makeQuestion(section, "Which word does not belong?", ["spring", "summer", "Tuesday", "winter"], 2, "Tuesday is a day of the week. The others are seasons."),
    makeQuestion(section, "Which word does not belong?", ["apple", "banana", "chair", "grape"], 2, "Chair is furniture. The others are fruits."),
    makeQuestion(section, "Which word does not belong?", ["bus", "train", "airplane", "pillow"], 3, "Pillow is not transportation."),
    makeQuestion(section, "Which word does not belong?", ["red", "blue", "green", "barking"], 3, "Barking is an action. The others are colors."),
    makeQuestion(section, "Which word does not belong?", ["finger", "toe", "elbow", "sandwich"], 3, "Sandwich is food. The others are body parts."),
    makeQuestion(section, "Which word does not belong?", ["lion", "tiger", "zebra", "notebook"], 3, "Notebook is not an animal."),
    makeQuestion(section, "Which word does not belong?", ["hammer", "saw", "wrench", "cookie"], 3, "Cookie is not a tool."),
    makeQuestion(section, "Which word does not belong?", ["Monday", "Wednesday", "Friday", "rabbit"], 3, "Rabbit is an animal. The others are days."),
    makeQuestion(section, "Which word does not belong?", ["plate", "bowl", "cup", "pencil"], 3, "Pencil is for writing. The others hold food or drinks."),
    makeQuestion(section, "Which word does not belong?", ["whisper", "shout", "sing", "banana"], 3, "Banana is food. The others are things you do with your voice."),
    makeQuestion(section, "The girl wore boots because outside was very ...", ["rainy", "quiet", "soft", "round"], 0, "Boots are useful when it is rainy."),
    makeQuestion(section, "To finish the puzzle, Liam needed to find the missing ...", ["color", "piece", "room", "laugh"], 1, "A puzzle is completed with the missing piece."),
    makeQuestion(section, "The teacher asked everyone to whisper in the ...", ["playground", "library", "parking lot", "garden"], 1, "People whisper in a library to stay quiet."),
    makeQuestion(section, "If you forgot your lunch, you might feel ...", ["sleepy", "hungry", "tiny", "sticky"], 1, "If you do not eat lunch, you feel hungry."),
    makeQuestion(section, "The rabbit moved quickly into its ...", ["burrow", "paint", "pencil", "clock"], 0, "A rabbit goes into its burrow."),
    makeQuestion(section, "Nora put the ice cream in the freezer so it would not ...", ["jump", "melt", "read", "bark"], 1, "Ice cream melts if it gets warm."),
    makeQuestion(section, "When two friends share kindly, they are being ...", ["fair", "loud", "late", "crooked"], 0, "Sharing kindly is fair."),
    makeQuestion(section, "Sam used a map because he did not know the ...", ["song", "way", "snack", "story"], 1, "Maps help when you do not know the way."),
    makeQuestion(section, "The baby yawned, rubbed its eyes, and felt very ...", ["sleepy", "shiny", "sharp", "empty"], 0, "Yawning and rubbing eyes usually mean sleepy."),
    makeQuestion(section, "If a story is funny, you might start to ...", ["laugh", "freeze", "drip", "fold"], 0, "Funny stories make people laugh."),
  ];
}

function quantitativeQuestions() {
  const section = "Quantitative Reasoning";
  return [
    makeQuestion(section, "What number comes next?", ["9", "10", "11", "12"], 1, "The pattern adds 2 each time: 2, 4, 6, 8, 10.", "2, 4, 6, 8, ?"),
    makeQuestion(section, "What number comes next?", ["22", "24", "25", "30"], 2, "The pattern adds 5 each time: 5, 10, 15, 20, 25.", "5, 10, 15, 20, ?"),
    makeQuestion(section, "What number comes next?", ["7", "8", "9", "10"], 2, "The pattern subtracts 3 each time: 21, 18, 15, 12, 9.", "21, 18, 15, 12, ?"),
    makeQuestion(section, "What number comes next?", ["22", "23", "24", "25"], 2, "The pattern adds 5 each time: 4, 9, 14, 19, 24.", "4, 9, 14, 19, ?"),
    makeQuestion(section, "What number comes next?", ["11", "13", "15", "17"], 1, "Each number goes up by 3: 1, 4, 7, 10, 13.", "1, 4, 7, 10, ?"),
    makeQuestion(section, "What number comes next?", ["16", "17", "18", "19"], 2, "The pattern subtracts 3: 30, 27, 24, 21, 18.", "30, 27, 24, 21, ?"),
    makeQuestion(section, "What number comes next?", ["12", "13", "14", "15"], 2, "The pattern adds 3: 2, 5, 8, 11, 14.", "2, 5, 8, 11, ?"),
    makeQuestion(section, "What number comes next?", ["6", "7", "8", "9"], 2, "The pattern subtracts 2: 16, 14, 12, 10, 8.", "16, 14, 12, 10, ?"),
    makeQuestion(section, "What number comes next?", ["15", "16", "17", "18"], 1, "The jumps grow by 1 each time: +1, +2, +3, +4, so next is +5.", "1, 2, 4, 7, 11, ?"),
    makeQuestion(section, "What number comes next?", ["60", "70", "75", "90"], 1, "The pattern counts down by 10: 100, 90, 80, 70.", "100, 90, 80, ?"),
    makeQuestion(section, "What number comes next?", ["24", "27", "28", "29"], 2, "The pattern counts by 7s: 7, 14, 21, 28.", "7, 14, 21, ?"),
    makeQuestion(section, "Mia has 14 stickers and gives away 5. How many are left?", ["8", "9", "10", "11"], 1, "14 minus 5 equals 9."),
    makeQuestion(section, "A box has 4 rows of 3 crayons. How many crayons are there?", ["7", "10", "12", "14"], 2, "4 rows of 3 means 4 × 3 = 12."),
    makeQuestion(section, "Ben read 6 pages on Monday and 8 pages on Tuesday. How many pages did he read?", ["12", "13", "14", "15"], 2, "6 plus 8 equals 14."),
    makeQuestion(section, "Which is greater?", ["3 + 7", "5 + 4", "They are equal", "Not enough information"], 0, "3 + 7 = 10 and 5 + 4 = 9, so 3 + 7 is greater."),
    makeQuestion(section, "Which number is smallest?", ["29", "92", "52", "25"], 3, "25 is the smallest value."),
    makeQuestion(section, "18 is 10 more than ...", ["6", "7", "8", "9"], 2, "If 18 is 10 more, then the missing number is 8."),
    makeQuestion(section, "Lily had 20 beads. She used 6 beads on each of 2 bracelets. How many beads are left?", ["6", "8", "10", "12"], 1, "She used 12 beads total. 20 minus 12 equals 8."),
    makeQuestion(section, "A shape with 4 equal sides is most likely a ...", ["circle", "triangle", "square", "oval"], 2, "A square has 4 equal sides."),
    makeQuestion(section, "12 + __ = 19", ["5", "6", "7", "8"], 2, "19 minus 12 equals 7."),
    makeQuestion(section, "What number could come next?", ["18", "20", "21", "22"], 2, "The pattern adds 4: 5, 9, 13, 17, 21.", "5, 9, 13, 17, ?"),
    makeQuestion(section, "Tom has 3 bags with 5 marbles in each bag. How many marbles does he have?", ["8", "10", "15", "18"], 2, "3 groups of 5 equals 15."),
    makeQuestion(section, "Which number is closest to 50?", ["47", "39", "61", "28"], 0, "47 is only 3 away from 50."),
    makeQuestion(section, "There are 24 students. If 6 sit at each table, how many tables are needed?", ["3", "4", "5", "6"], 1, "24 divided by 6 equals 4."),
    makeQuestion(section, "9 + 8 = 17. Then 17 - 6 = ...", ["10", "11", "12", "13"], 1, "17 minus 6 equals 11."),
    makeQuestion(section, "Which is an even number?", ["17", "23", "18", "31"], 2, "18 is divisible by 2, so it is even."),
    makeQuestion(section, "What is half of 14?", ["6", "7", "8", "9"], 1, "Half of 14 is 7."),
    makeQuestion(section, "If you count by 5s starting at 25, what comes next?", ["28", "29", "30", "35"], 2, "25, 30, 35... the next number is 30."),
    makeQuestion(section, "What number is between 46 and 48?", ["45", "46", "47", "49"], 2, "47 is between 46 and 48."),
    makeQuestion(section, "Ava has twice as many apples as 3. How many apples does she have?", ["5", "6", "7", "8"], 1, "Twice as many as 3 is 6."),
    makeQuestion(section, "If 4 dogs have 4 legs each, how many legs are there?", ["8", "12", "16", "20"], 2, "4 times 4 equals 16."),
    makeQuestion(section, "Which is greater?", ["7 tens", "65 ones", "They are equal", "Not enough information"], 0, "7 tens is 70, and 65 ones is 65."),
    makeQuestion(section, "What number comes next?", ["19", "20", "21", "22"], 2, "The pattern adds 3 each time: 9, 12, 15, 18, 21.", "9, 12, 15, 18, ?"),
    makeQuestion(section, "40 - 13 = ...", ["25", "26", "27", "28"], 2, "40 minus 13 equals 27."),
    makeQuestion(section, "What number comes next?", ["47", "48", "49", "50"], 2, "The pattern counts by 2: 41, 43, 45, 47, 49.", "41, 43, 45, 47, ?"),
  ];
}

function patternQuestions() {
  const section = "Pattern & Spatial";
  const grid = "A   B   C\nD   E   F\nG   H   I";

  return [
    makeQuestion(section, "What comes next in the pattern?", ["●", "■", "▲", "○"], 0, "The pattern alternates triangle, circle, triangle, circle.", "▲   ●   ▲   ●   ▲   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["▲", "■", "●", "■■"], 1, "The pattern repeats: two squares, one triangle.", "■   ■   ▲   ■   ■   ▲   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["★", "☆", "◆", "●"], 1, "The stars alternate filled and outlined.", "★   ☆   ★   ☆   ★   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["⬜", "◼", "◻", "⬛"], 0, "The pattern repeats one light square and two dark squares.", "⬜   ◼   ◼   ⬜   ◼   ◼   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["←", "→", "↑", "↓"], 3, "The arrows alternate right, down, right, down.", "→   ↓   →   ↓   →   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["○", "△", "□", "●"], 0, "The pattern repeats two circles, one triangle.", "○   ○   △   ○   ○   △   ?"),
    makeQuestion(section, "What should replace the question mark?", ["big ●", "small ●", "big ■", "small ▲"], 0, "The shape changes after each pair and the size alternates small then big.", "small ▲   big ▲   small ■   big ■   small ●   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["◆◆◆", "◆◆◆◆", "◆◆", "◆"], 1, "The number of diamonds increases by one each step.", "◆   ◆◆   ◆◆◆   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["↑", "→", "↓", "←"], 1, "The arrows turn 90 degrees clockwise each time.", "↑   →   ↓   ←   ↑   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["●▲", "●●▲", "▲●●", "▲▲●"], 1, "The whole pattern block repeats.", "●●▲   ●●▲   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["△", "□", "○", "◆"], 2, "The pattern repeats triangle, square, circle.", "△   □   ○   △   □   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["★", "☆", "★★", "☆☆"], 0, "The pattern repeats two stars, one outlined star.", "★   ★   ☆   ★   ★   ☆   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["⬇", "⬆", "➡", "⬅"], 1, "The pattern repeats up, up, down.", "⬆   ⬆   ⬇   ⬆   ⬆   ⬇   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["◐", "◑", "◒", "◓"], 1, "The half circles alternate left and right.", "◐   ◑   ◐   ◑   ◐   ?"),
    makeQuestion(section, "What comes next in the pattern?", ["●●", "●●●", "◆◆◆◆", "◆◆"], 1, "The number of circles grows to match the number of diamonds before it.", "◆   ●   ◆◆   ●●   ◆◆◆   ?"),
    makeQuestion(section, "Which one does not belong?", ["▲", "▲", "▲", "●"], 3, "Three choices are triangles. One is a circle."),
    makeQuestion(section, "Which one does not belong?", ["□", "□", "■", "□"], 2, "Three squares are outlines. One is filled."),
    makeQuestion(section, "Top row: △ becomes ▲. Bottom row: □ becomes ...", ["□", "■", "△", "▲"], 1, "The top shape changes from outline to filled. The bottom shape should do the same."),
    makeQuestion(section, "Top row: ○ becomes ○○. Bottom row: ■ becomes ...", ["■", "■■", "○", "▲"], 1, "The second picture has two of the first one, so ■ becomes ■■."),
    makeQuestion(section, "Top row: → becomes ↓. Bottom row: ← becomes ...", ["↑", "→", "↓", "←"], 0, "The top arrow turns clockwise once. Turning left clockwise gives up."),
    makeQuestion(section, "Top row: ★ becomes ★★. Bottom row: ◆ becomes ...", ["◆", "◆◆", "★★", "◇"], 1, "The pattern doubles the shape count."),
    makeQuestion(section, "Which one does not belong?", ["↗", "↗", "↘", "↗"], 2, "Three arrows point up-right. One points down-right."),
    makeQuestion(section, "Small ○ becomes big ○. Small △ becomes ...", ["small △", "big △", "small ○", "big □"], 1, "The size changes from small to big."),
    makeQuestion(section, "If △ changes to ▲, how should □ change?", ["◇", "■", "△", "○"], 1, "An outline shape becomes a filled shape."),
    makeQuestion(section, "What should come next?", ["●●●", "●●●●", "●●", "○○○"], 1, "The number of dots grows by one each time.", "●   ●●   ●●●   ?"),
    makeQuestion(section, "Use the grid. Start at E. Move left, then down. Where do you end?", ["D", "F", "G", "H"], 2, "From E go left to D, then down to G.", grid),
    makeQuestion(section, "Use the grid. Start at B. Move down, then down. Where do you end?", ["E", "G", "H", "I"], 2, "From B move to E, then to H.", grid),
    makeQuestion(section, "Use the grid. Start at G. Move right, then up. Where do you end?", ["D", "E", "F", "H"], 1, "From G move right to H, then up to E.", grid),
    makeQuestion(section, "Use the grid. Start at C. Move left, then down, then down. Where do you end?", ["F", "G", "H", "I"], 2, "From C move to B, then E, then H.", grid),
    makeQuestion(section, "Use the grid. Start at D. Move right, then right. Where do you end?", ["E", "F", "G", "H"], 1, "From D move to E, then to F.", grid),
    makeQuestion(section, "Use the grid. Start at H. Move up, then right. Where do you end?", ["C", "D", "E", "F"], 3, "From H go up to E, then right to F.", grid),
    makeQuestion(section, "Use the grid. Start at A. Move down, then right, then right. Where do you end?", ["D", "E", "F", "I"], 2, "From A go to D, then E, then F.", grid),
    makeQuestion(section, "Use the grid. Start at F. Move left, then left, then down. Where do you end?", ["D", "E", "G", "H"], 2, "From F go to E, then D, then G.", grid),
    makeQuestion(section, "Use the grid. Start at I. Move up, then left. Where do you end?", ["D", "E", "F", "H"], 1, "From I go up to F, then left to E.", grid),
    makeQuestion(section, "Use the grid. Start at B. Move right, then down, then left. Where do you end?", ["D", "E", "F", "H"], 1, "From B go to C, then F, then left to E.", grid),
  ];
}

function buildQuestionBank() {
  const questions = [
    ...verbalQuestions(),
    ...quantitativeQuestions(),
    ...patternQuestions(),
  ].map((question, index) => ({
    id: index + 1,
    ...question,
  }));

  if (questions.length !== 100) {
    throw new Error(`Expected 100 questions, got ${questions.length}`);
  }

  return questions;
}

const questions = buildQuestionBank();
const TEST_DURATION_SECONDS = questions.length * 30;
answers = Array(questions.length).fill(null);
let timeRemaining = TEST_DURATION_SECONDS;

function answeredTotal() {
  return answers.filter((answer) => answer !== null).length;
}

function liveCorrectTotal() {
  return answers.filter((answer, index) => answer === questions[index].answer).length;
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
  return questions[index];
}

function sectionQuestions(section) {
  return questions.filter((question) => question.section === section);
}

function firstIndexForSection(section) {
  return questions.findIndex((question) => question.section === section);
}

function firstUnansweredIndexForSection(section) {
  const unanswered = questions.findIndex(
    (question, index) => question.section === section && answers[index] === null,
  );

  return unanswered !== -1 ? unanswered : firstIndexForSection(section);
}

function goToSection(section) {
  currentIndex = firstUnansweredIndexForSection(section);
  renderQuestion();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderSectionStats() {
  dom.sectionStats.innerHTML = "";

  for (const section of sections) {
    const questionsInSection = sectionQuestions(section);
    const sectionAnswered = questionsInSection.filter(
      (question) => answers[question.id - 1] !== null,
    ).length;

    const stat = document.createElement("button");
    stat.type = "button";
    stat.className = "section-button";
    if (questionAt(currentIndex).section === section) {
      stat.classList.add("is-active");
    }

    const targetIndex = firstUnansweredIndexForSection(section) + 1;
    stat.innerHTML = `
      <strong>${section}</strong>
      <span>${sectionAnswered} / ${questionsInSection.length} answered</span>
      <span>Go to question ${targetIndex}</span>
    `;
    stat.addEventListener("click", () => goToSection(section));
    dom.sectionStats.appendChild(stat);
  }
}

function updateProgress() {
  const total = answeredTotal();
  dom.answeredCount.textContent = `${total} / ${questions.length}`;
  dom.progressFill.style.width = `${(total / questions.length) * 100}%`;
  dom.scoreDisplay.textContent = `${liveCorrectTotal()} correct`;
  renderSectionStats();
}

function allQuestionsAnswered() {
  return answeredTotal() === questions.length;
}

function renderFeedback(question, savedAnswer) {
  if (savedAnswer === null) {
    dom.feedbackPanel.className = "feedback-panel is-hidden";
    dom.feedbackPanel.innerHTML = "";
    return;
  }

  const isCorrect = savedAnswer === question.answer;
  const correctAnswer = question.options[question.answer];
  dom.feedbackPanel.className = `feedback-panel ${isCorrect ? "is-correct" : "is-wrong"}`;
  dom.feedbackPanel.innerHTML = isCorrect
    ? `<strong>Correct</strong><span>${question.explanation}</span>`
    : `<strong>Not quite</strong><span>Correct answer: ${correctAnswer}. ${question.explanation}</span>`;
}

function renderQuestion() {
  const question = questionAt(currentIndex);
  const savedAnswer = answers[currentIndex];
  const isLocked = savedAnswer !== null || isSubmitted;

  dom.sectionBadge.textContent = question.section;
  dom.questionCounter.textContent = `Question ${question.id} of ${questions.length}`;
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

    if (savedAnswer === optionIndex) {
      button.classList.add("is-selected");
    }

    if (savedAnswer !== null) {
      if (optionIndex === question.answer) {
        button.classList.add("is-correct");
      } else if (savedAnswer === optionIndex) {
        button.classList.add("is-wrong");
      }
    }

    const letter = String.fromCharCode(65 + optionIndex);
    button.innerHTML = `<span class="option-letter">${letter}</span>${option}`;
    button.disabled = isLocked;

    if (!isLocked) {
      button.addEventListener("click", () => {
        answers[currentIndex] = optionIndex;
        updateProgress();
        renderQuestion();
      });
    }

    dom.optionsList.appendChild(button);
  });

  renderFeedback(question, savedAnswer);
  dom.nextHint.classList.toggle("is-hidden", savedAnswer !== null || isSubmitted);

  dom.nextButton.textContent = isSubmitted
    ? currentIndex === questions.length - 1
      ? "Finished"
      : "Next"
    : allQuestionsAnswered() || currentIndex === questions.length - 1
      ? "See Results"
      : "Next";
  dom.nextButton.disabled =
    (!isSubmitted && savedAnswer === null) ||
    (isSubmitted && currentIndex === questions.length - 1);
}

function scoreQuestions() {
  let correct = 0;
  const sectionScores = {};
  const missed = [];

  for (const section of sections) {
    sectionScores[section] = { correct: 0, total: 0 };
  }

  questions.forEach((question, index) => {
    const chosen = answers[index];
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

function summaryText(score) {
  if (score >= 85) {
    return "Excellent practice result. She is showing strong readiness across multiple reasoning types.";
  }

  if (score >= 70) {
    return "Strong practice result. Review the missed questions and repeat the test in a few days.";
  }

  if (score >= 55) {
    return "Good practice start. Focus on one section at a time and build confidence with repeated practice.";
  }

  return "This is a useful baseline. Go slowly, review explanations together, and aim for steady improvement.";
}

function renderResults() {
  const { correct, missed, sectionScores } = scoreQuestions();
  dom.resultsSection.classList.remove("is-hidden");
  dom.scoreHeadline.textContent = `You scored ${correct} out of ${questions.length}`;
  dom.scoreSummary.textContent = summaryText(correct);
  dom.timeSummary.textContent = `Time used: ${formatTime(TEST_DURATION_SECONDS - timeRemaining)}.`;

  dom.resultsBreakdown.innerHTML = "";
  for (const section of sections) {
    const { correct: sectionCorrect, total } = sectionScores[section];
    const card = document.createElement("div");
    card.className = "breakdown-card";
    card.innerHTML = `
      <strong>${section}</strong>
      <span>${sectionCorrect} correct out of ${total}</span>
      <span>${Math.round((sectionCorrect / total) * 100)}% in this section</span>
    `;
    dom.resultsBreakdown.appendChild(card);
  }

  dom.reviewList.innerHTML = "";
  if (missed.length === 0) {
    const card = document.createElement("div");
    card.className = "review-card";
    card.innerHTML = `
      <h4>Perfect score</h4>
      <p>No missed questions this time.</p>
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

function restartTest() {
  clearTimer();
  answers = Array(questions.length).fill(null);
  currentIndex = 0;
  timeRemaining = TEST_DURATION_SECONDS;
  isSubmitted = false;
  dom.resultsSection.classList.add("is-hidden");
  dom.timeSummary.textContent = "";
  updateProgress();
  updateTimerDisplay();
  renderQuestion();
  startTimer();
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
  dom.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

dom.nextButton.addEventListener("click", () => {
  if (!isSubmitted && answers[currentIndex] === null) {
    return;
  }

  if (!isSubmitted && (allQuestionsAnswered() || currentIndex === questions.length - 1)) {
    submitTest();
    return;
  }

  if (currentIndex === questions.length - 1) {
    if (!isSubmitted) {
      submitTest();
    }
    return;
  }

  currentIndex += 1;
  renderQuestion();
});

dom.restartButton.addEventListener("click", restartTest);
dom.retryButton.addEventListener("click", restartTest);
dom.backToQuestionsButton.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

updateProgress();
updateTimerDisplay();
renderQuestion();
startTimer();
