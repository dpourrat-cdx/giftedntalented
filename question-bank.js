(function () {
  const SECTIONS = [
    "Verbal",
    "Math",
    "Nonverbal",
    "Spatial",
    "Patterns",
    "Analogies",
    "Categories",
    "Logic",
  ];

  const QUESTIONS_PER_SECTION = 134;
  const QUESTIONS_PER_TEST_SECTION = 8;
  const QUESTION_HISTORY_STORAGE_KEY = "gifted-question-history-v1";
  const RECENT_HISTORY_LIMIT = QUESTIONS_PER_TEST_SECTION * 4;

  function seededShuffle(items, seed) {
    const list = [...items];
    let value = seed * 7919 + 104729;

    for (let index = list.length - 1; index > 0; index -= 1) {
      value = (value * 1103515245 + 12345) & 0x7fffffff;
      const swapIndex = value % (index + 1);
      [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
    }

    return list;
  }

  function uniqueValues(values) {
    return values.filter((value, index) => values.indexOf(value) === index);
  }

  function buildChoices(correct, distractors, seed) {
    const choices = uniqueValues([String(correct), ...distractors.map(String)]);

    if (choices.length !== 4) {
      throw new Error(`Expected 4 unique choices, got ${choices.length}: ${choices.join(", ")}`);
    }

    const options = seededShuffle(choices, seed);

    return {
      options,
      answer: options.indexOf(String(correct)),
    };
  }

  function pickDistractors(options, correct, count, seed) {
    return seededShuffle(options.filter((option) => option !== correct), seed).slice(0, count);
  }

  function numericDistractors(correct, offsets) {
    const distractors = [];

    for (const offset of offsets) {
      const value = correct + offset;
      if (value >= 0 && value !== correct && !distractors.includes(value)) {
        distractors.push(value);
      }

      if (distractors.length === 3) {
        break;
      }
    }

    let nextOffset = 4;
    while (distractors.length < 3) {
      const candidate = correct + nextOffset;
      if (!distractors.includes(candidate) && candidate !== correct) {
        distractors.push(candidate);
      }
      nextOffset += 1;
    }

    return distractors;
  }

  function makeChoiceQuestion(section, prompt, correct, distractors, explanation, stimulus = "", seed = 1) {
    const { options, answer } = buildChoices(correct, distractors, seed);
    return {
      section,
      prompt,
      options,
      answer,
      explanation,
      stimulus,
    };
  }

  function makeNumericQuestion(section, prompt, correct, explanation, seed, stimulus = "") {
    return makeChoiceQuestion(
      section,
      prompt,
      String(correct),
      numericDistractors(correct, [-2, -1, 1, 2, 3, -3]).map(String),
      explanation,
      stimulus,
      seed,
    );
  }

  function sampleWithoutReplacement(items, count) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy.slice(0, count);
  }

  function loadQuestionHistory() {
    if (!window.localStorage) {
      return {};
    }

    try {
      const rawValue = window.localStorage.getItem(QUESTION_HISTORY_STORAGE_KEY);
      if (!rawValue) {
        return {};
      }

      const parsed = JSON.parse(rawValue);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveQuestionHistory(history) {
    if (!window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(QUESTION_HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      // Ignore storage failures and keep question selection working.
    }
  }

  function mergeRecentQuestionIds(previousIds, nextIds) {
    return [...nextIds, ...previousIds.filter((id) => !nextIds.includes(id))].slice(0, RECENT_HISTORY_LIMIT);
  }

  function assignBankQuestionIds(pool) {
    const questionPoolWithIds = {};

    SECTIONS.forEach((section) => {
      questionPoolWithIds[section] = pool[section].map((question, index) => ({
        ...question,
        bankId: `${section}:${index + 1}`,
      }));
    });

    return questionPoolWithIds;
  }

  function selectQuestionsForSection(section, historyBySection, pool) {
    const sectionQuestions = pool[section];
    const recentIds = Array.isArray(historyBySection[section]) ? historyBySection[section] : [];
    const recentIdSet = new Set(recentIds);
    const freshQuestions = sectionQuestions.filter((question) => !recentIdSet.has(question.bankId));

    let selectedQuestions = [];

    if (freshQuestions.length >= QUESTIONS_PER_TEST_SECTION) {
      selectedQuestions = sampleWithoutReplacement(freshQuestions, QUESTIONS_PER_TEST_SECTION);
    } else {
      const recentQuestions = sectionQuestions.filter((question) => recentIdSet.has(question.bankId));
      selectedQuestions = [
        ...sampleWithoutReplacement(freshQuestions, freshQuestions.length),
        ...sampleWithoutReplacement(recentQuestions, QUESTIONS_PER_TEST_SECTION - freshQuestions.length),
      ];
      selectedQuestions = sampleWithoutReplacement(selectedQuestions, selectedQuestions.length);
    }

    return selectedQuestions;
  }

  function buildAnswerSlotPlan(count) {
    const slots = [];

    while (slots.length + 4 <= count) {
      slots.push(0, 1, 2, 3);
    }

    if (slots.length < count) {
      slots.push(...sampleWithoutReplacement([0, 1, 2, 3], count - slots.length));
    }

    return sampleWithoutReplacement(slots, slots.length);
  }

  function placeCorrectAnswer(question, targetIndex) {
    const correctOption = question.options[question.answer];
    const distractors = sampleWithoutReplacement(
      question.options.filter((_, optionIndex) => optionIndex !== question.answer),
      3,
    );
    const options = [];
    let distractorIndex = 0;

    for (let optionIndex = 0; optionIndex < 4; optionIndex += 1) {
      if (optionIndex === targetIndex) {
        options.push(correctOption);
      } else {
        options.push(distractors[distractorIndex]);
        distractorIndex += 1;
      }
    }

    return {
      ...question,
      options,
      answer: targetIndex,
    };
  }

  function formatRows(rows) {
    return rows.join("\n");
  }

  function joinWithAnd(items) {
    if (items.length === 0) {
      return "";
    }

    if (items.length === 1) {
      return items[0];
    }

    if (items.length === 2) {
      return `${items[0]} and ${items[1]}`;
    }

    return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
  }

  function completeSentenceExplanation(prompt, correct) {
    const completed = prompt.replace("___", correct);
    return `Putting "${correct}" in the blank makes the sentence read: "${completed}" That is the only choice that makes the whole idea clear and logical.`;
  }

  function clueExplanation(prompt, correct) {
    const clueText = prompt.endsWith("?") ? prompt.slice(0, -1) : prompt;
    return `The clue asks, "${clueText}." ${correct} is the choice that fits that clue.`;
  }

  function synonymExplanation(word, correct) {
    return `${correct} means almost the same as ${word}, while the other choices do not share that meaning.`;
  }

  function antonymExplanation(word, correct) {
    return `${correct} means the opposite of ${word}. If something is ${word}, it is not ${correct}.`;
  }

  function findRepeatingBlock(sequence) {
    for (let size = 1; size <= sequence.length; size += 1) {
      const block = sequence.slice(0, size);
      let isMatch = true;

      for (let index = 0; index < sequence.length; index += 1) {
        if (sequence[index] !== block[index % size]) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        return block;
      }
    }

    return null;
  }

  function repeatingPatternExplanation(stimulus, correct, itemLabel = "item") {
    const sequence = (stimulus.includes("|") ? stimulus.split("|") : stimulus.split(/\s{2,}/))
      .map((part) => part.trim())
      .filter((part) => part && part !== "?");
    const block = findRepeatingBlock(sequence);

    if (block && block.length > 0) {
      return `The pattern repeats ${block.join(", ")}, so the next ${itemLabel} is ${correct}.`;
    }

    return `${correct} is the next ${itemLabel} in the pattern.`;
  }

  function describeSignedChange(value) {
    return value > 0 ? `+${value}` : `${value}`;
  }

  function explainNumberSequence(sequence, correct) {
    const differences = sequence.slice(1).map((value, index) => value - sequence[index]);

    if (differences.every((difference) => difference === differences[0])) {
      return `The pattern changes by ${describeSignedChange(differences[0])} each time: ${sequence.join(", ")}. So the next number is ${correct}.`;
    }

    const differenceSteps = differences.slice(1).map((value, index) => value - differences[index]);

    if (differenceSteps.length > 0 && differenceSteps.every((step) => step === differenceSteps[0])) {
      const nextDifference = differences[differences.length - 1] + differenceSteps[0];
      return `The jumps are ${differences.map(describeSignedChange).join(", ")}, so the next jump is ${describeSignedChange(nextDifference)}. ${sequence[sequence.length - 1]} ${nextDifference < 0 ? "-" : "+"} ${Math.abs(nextDifference)} = ${correct}.`;
    }

    return `Following the pattern step by step leads to ${correct}.`;
  }

  function greatestNumberExplanation(correct, options) {
    const otherChoices = options.filter((option) => String(option) !== String(correct)).map(String);
    return `${correct} is greater than ${joinWithAnd(otherChoices)}, so it is the greatest number.`;
  }

  function groupExplanation(item, category) {
    return `${item} belongs in the ${category} group, so ${category} is the correct category name.`;
  }

  function rotateDirection(direction, turn) {
    const directions = ["north", "east", "south", "west"];
    const index = directions.indexOf(direction);
    const offset = turn === "right" ? 1 : turn === "left" ? -1 : 2;
    return directions[(index + offset + directions.length) % directions.length];
  }

  function buildGrid(size) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".slice(0, size * size).split("");
    const rows = [];
    for (let row = 0; row < size; row += 1) {
      rows.push(letters.slice(row * size, row * size + size));
    }
    return rows;
  }

  function gridLabel(grid, row, col) {
    return grid[row][col];
  }

  function allGridLabels(grid) {
    return grid.flat();
  }

  function moveOnGrid(position, move) {
    return {
      row: position.row + move.row,
      col: position.col + move.col,
    };
  }

  function validMovesFor(grid, position) {
    const moves = [
      { name: "up", row: -1, col: 0 },
      { name: "down", row: 1, col: 0 },
      { name: "left", row: 0, col: -1 },
      { name: "right", row: 0, col: 1 },
    ];

    return moves.filter((move) => {
      const next = moveOnGrid(position, move);
      return next.row >= 0 && next.row < grid.length && next.col >= 0 && next.col < grid.length;
    });
  }

  function buildVerbalQuestions() {
    const section = SECTIONS[0];
    const synonymSet = [
      ["tiny", "small", ["loud", "sleepy", "round"]],
      ["quick", "fast", ["wet", "cold", "slow"]],
      ["happy", "glad", ["angry", "early", "dry"]],
      ["begin", "start", ["finish", "carry", "whisper"]],
      ["silent", "quiet", ["rough", "bright", "heavy"]],
      ["brave", "bold", ["timid", "soft", "dirty"]],
      ["gift", "present", ["blanket", "basket", "garden"]],
      ["finish", "end", ["open", "push", "laugh"]],
      ["clever", "smart", ["messy", "tiny", "lazy"]],
      ["look", "see", ["mix", "drop", "hide"]],
      ["large", "big", ["thin", "late", "clean"]],
      ["simple", "easy", ["hard", "full", "old"]],
      ["close", "shut", ["climb", "measure", "erase"]],
      ["jump", "leap", ["walk", "close", "sweep"]],
      ["path", "road", ["table", "season", "candle"]],
      ["child", "kid", ["glove", "bridge", "clock"]],
      ["shout", "yell", ["whisper", "paint", "carry"]],
      ["chilly", "cold", ["thick", "warm", "safe"]],
      ["tidy", "neat", ["crooked", "muddy", "sleepy"]],
      ["choose", "pick", ["drop", "wave", "push"]],
      ["story", "tale", ["plate", "shirt", "pencil"]],
      ["trash", "garbage", ["music", "forest", "water"]],
      ["angry", "mad", ["glad", "round", "early"]],
      ["sick", "ill", ["strong", "clean", "soft"]],
      ["piece", "part", ["storm", "bread", "jacket"]],
    ];

    const antonymSet = [
      ["empty", "full", ["open", "small", "soft"]],
      ["early", "late", ["slow", "tiny", "clean"]],
      ["noisy", "quiet", ["sticky", "green", "thick"]],
      ["tall", "short", ["bright", "warm", "hard"]],
      ["soft", "hard", ["gentle", "round", "above"]],
      ["before", "after", ["inside", "up", "near"]],
      ["up", "down", ["first", "fast", "over"]],
      ["wet", "dry", ["cold", "sad", "bumpy"]],
      ["open", "closed", ["tall", "empty", "dark"]],
      ["inside", "outside", ["first", "thick", "full"]],
      ["push", "pull", ["climb", "hide", "whisper"]],
      ["first", "last", ["far", "down", "light"]],
      ["above", "below", ["same", "soft", "empty"]],
      ["happy", "sad", ["round", "clean", "young"]],
      ["near", "far", ["left", "dark", "early"]],
      ["strong", "weak", ["heavy", "wet", "sleepy"]],
      ["bright", "dark", ["fast", "close", "small"]],
      ["thick", "thin", ["hard", "quiet", "full"]],
      ["hot", "cold", ["late", "clean", "down"]],
      ["day", "night", ["winter", "spring", "light"]],
      ["left", "right", ["large", "dry", "short"]],
      ["clean", "dirty", ["wet", "open", "soft"]],
      ["young", "old", ["early", "empty", "long"]],
      ["fast", "slow", ["loud", "dry", "thin"]],
      ["same", "different", ["happy", "close", "above"]],
    ];

    const sentenceSet = [
      ["The girl wore boots because it was ___ outside.", "rainy", ["quiet", "round", "sticky"]],
      ["To finish the puzzle, Liam needed the missing ___.", "piece", ["window", "nap", "song"]],
      ["The teacher asked everyone to whisper in the ___.", "library", ["playground", "bakery", "garage"]],
      ["If you forgot your lunch, you might feel ___.", "hungry", ["shiny", "square", "muddy"]],
      ["The rabbit hurried back to its ___.", "burrow", ["drum", "pencil", "pillow"]],
      ["Nora put the ice cream in the freezer so it would not ___.", "melt", ["read", "skip", "bark"]],
      ["When two friends share kindly, they are being ___.", "fair", ["late", "loud", "crooked"]],
      ["Sam used a map because he did not know the ___.", "way", ["color", "bedtime", "flavor"]],
      ["The baby yawned and rubbed its eyes because it was ___.", "sleepy", ["brave", "spicy", "empty"]],
      ["If a joke is funny, you might ___.", "laugh", ["fold", "freeze", "whisper"]],
      ["Mia turned on the lamp because the room was ___.", "dark", ["hungry", "smooth", "noisy"]],
      ["Ben carried an umbrella because it might ___.", "rain", ["glow", "sing", "tumble"]],
      ["A backpack is useful because it can hold your ___.", "books", ["fence", "carpet", "thunder"]],
      ["A seed is planted in soil so it can ___.", "grow", ["bark", "float", "whistle"]],
      ["Scissors are used to ___ paper.", "cut", ["wear", "taste", "build"]],
      ["A ruler helps you ___ a line.", "measure", ["hide", "boil", "kick"]],
      ["Binoculars help you see things that are very ___.", "far", ["sticky", "square", "quiet"]],
      ["A dentist checks your ___.", "teeth", ["crayons", "socks", "backpack"]],
      ["An oven is used to ___ food.", "bake", ["draw", "open", "sort"]],
      ["An alarm clock helps you wake up on ___.", "time", ["paint", "clouds", "grass"]],
      ["A winter coat keeps you warm when it is ___.", "cold", ["bright", "tiny", "crunchy"]],
      ["If you are thirsty, you should drink ___.", "water", ["paper", "buttons", "music"]],
      ["If a toy breaks, you may try to ___.", "fix", ["blink", "bury", "stir"]],
      ["You erase a pencil mistake with an ___.", "eraser", ["ladder", "apron", "whistle"]],
      ["A plant needs sunlight to stay ___.", "healthy", ["empty", "crooked", "noisy"]],
    ];

    const clueSet = [
      ["Which word names the place where you borrow books?", "library", ["kitchen", "garage", "forest"]],
      ["Which word names a person who teaches a class?", "teacher", ["farmer", "baker", "painter"]],
      ["What do you call a baby cat?", "kitten", ["puppy", "calf", "cub"]],
      ["What day comes after Tuesday?", "Wednesday", ["Monday", "Friday", "Sunday"]],
      ["In which season do leaves usually fall from trees?", "autumn", ["spring", "summer", "winter"]],
      ["Which shape has three sides?", "triangle", ["circle", "rectangle", "oval"]],
      ["What number comes right after 39?", "40", ["38", "41", "49"]],
      ["Which animal gives us wool?", "sheep", ["duck", "horse", "pig"]],
      ["Which tool is used for digging?", "shovel", ["pillow", "spoon", "ruler"]],
      ["Which room is mainly used for cooking?", "kitchen", ["hallway", "attic", "bedroom"]],
      ["Which person helps put out fires?", "firefighter", ["drummer", "dentist", "librarian"]],
      ["What do we call water when it is frozen?", "ice", ["juice", "steam", "rain"]],
      ["Which object tells time?", "clock", ["helmet", "blanket", "ladder"]],
      ["Which tool uses ink for writing?", "pen", ["glue", "plate", "eraser"]],
      ["Where might you go to see many animals?", "zoo", ["garage", "classroom", "bank"]],
      ["Which insect makes honey?", "bee", ["moth", "cricket", "ant"]],
      ["Which machine keeps food cold?", "refrigerator", ["toaster", "lamp", "camera"]],
      ["Which person helps sick people get better?", "doctor", ["artist", "pilot", "swimmer"]],
      ["Where do airplanes take off and land?", "airport", ["tunnel", "farm", "harbor"]],
      ["What do you use to unlock a door?", "key", ["mitten", "spoon", "ball"]],
      ["What month comes after April?", "May", ["January", "June", "March"]],
      ["Which animal has black and white stripes?", "zebra", ["giraffe", "horse", "panda"]],
      ["Which coin is worth one cent?", "penny", ["quarter", "dime", "nickel"]],
      ["Which planet do we live on?", "Earth", ["Mars", "Moon", "Sun"]],
      ["Which tool helps you see tiny things up close?", "magnifying glass", ["helmet", "shovel", "paintbrush"]],
    ];

    const questions = [];

    synonymSet.forEach(([word, correct, distractors], index) => {
      questions.push(
        makeChoiceQuestion(
          section,
          `Which word means almost the same as "${word}"?`,
          correct,
          distractors,
          synonymExplanation(word, correct),
          "",
          1000 + index,
        ),
      );
    });

    antonymSet.forEach(([word, correct, distractors], index) => {
      questions.push(
        makeChoiceQuestion(
          section,
          `Which word means the opposite of "${word}"?`,
          correct,
          distractors,
          antonymExplanation(word, correct),
          "",
          1100 + index,
        ),
      );
    });

    sentenceSet.forEach(([prompt, correct, distractors], index) => {
      questions.push(
        makeChoiceQuestion(
          section,
          prompt,
          correct,
          distractors,
          completeSentenceExplanation(prompt, correct),
          "",
          1200 + index,
        ),
      );
    });

    clueSet.forEach(([prompt, correct, distractors], index) => {
      questions.push(
        makeChoiceQuestion(
          section,
          prompt,
          correct,
          distractors,
          clueExplanation(prompt, correct),
          "",
          1300 + index,
        ),
      );
    });

    questions.push(...buildVerbalChallengeQuestions(section));

    return questions;
  }

  function buildQuantitativeQuestions() {
    const section = SECTIONS[1];
    const questions = [];

    for (let index = 0; index < 20; index += 1) {
      if (index % 2 === 0) {
        const left = 8 + index;
        const right = 3 + (index % 6);
        const correct = left + right;
        questions.push(
          makeNumericQuestion(
            section,
            `What is ${left} + ${right}?`,
            correct,
            `${left} + ${right} = ${correct}.`,
            2000 + index,
          ),
        );
      } else {
        const left = 18 + index;
        const right = 4 + (index % 5);
        const correct = left - right;
        questions.push(
          makeNumericQuestion(
            section,
            `What is ${left} - ${right}?`,
            correct,
            `${left} - ${right} = ${correct}.`,
            2000 + index,
          ),
        );
      }
    }

    for (let index = 0; index < 20; index += 1) {
      const addend = 6 + index;
      const missing = 3 + (index % 7);
      const total = addend + missing;

      if (index % 2 === 0) {
        questions.push(
          makeNumericQuestion(
            section,
            `${addend} + __ = ${total}`,
            missing,
            `${total} - ${addend} = ${missing}.`,
            2100 + index,
          ),
        );
      } else {
        const whole = total + 4;
        const hidden = whole - addend;
        questions.push(
          makeNumericQuestion(
            section,
            `${whole} - ${addend} = __`,
            hidden,
            `${whole} - ${addend} = ${hidden}.`,
            2100 + index,
          ),
        );
      }
    }

    for (let index = 0; index < 20; index += 1) {
      let sequence = [];
      let correct = 0;

      if (index % 4 === 0) {
        const start = 2 + index;
        sequence = [start, start + 2, start + 4, start + 6];
        correct = start + 8;
      } else if (index % 4 === 1) {
        const start = 28 + index;
        sequence = [start, start - 3, start - 6, start - 9];
        correct = start - 12;
      } else if (index % 4 === 2) {
        const start = 5 + index;
        sequence = [start, start + 5, start + 10, start + 15];
        correct = start + 20;
      } else {
        const start = 1 + Math.floor(index / 2);
        sequence = [start, start + 1, start + 3, start + 6];
        correct = start + 10;
      }

      questions.push(
        makeNumericQuestion(
          section,
          "What number comes next?",
          correct,
          explainNumberSequence(sequence, correct),
          2200 + index,
          `${sequence.join(", ")}, ?`,
        ),
      );
    }

    for (let index = 0; index < 20; index += 1) {
      if (index % 2 === 0) {
        const groups = 2 + (index % 4);
        const itemsPerGroup = 3 + (index % 5);
        const correct = groups * itemsPerGroup;
        questions.push(
          makeNumericQuestion(
            section,
            `There are ${groups} bags with ${itemsPerGroup} marbles in each bag. How many marbles are there?`,
            correct,
            `${groups} groups of ${itemsPerGroup} make ${correct}.`,
            2300 + index,
          ),
        );
      } else {
        const groups = 2 + (index % 4);
        const itemsPerGroup = 3 + (index % 5);
        const total = groups * itemsPerGroup;
        questions.push(
          makeNumericQuestion(
            section,
            `${total} crayons are shared equally into ${groups} boxes. How many crayons go in each box?`,
            itemsPerGroup,
            `${total} divided into ${groups} equal boxes gives ${itemsPerGroup} in each box.`,
            2300 + index,
          ),
        );
      }
    }

    for (let index = 0; index < 20; index += 1) {
      if (index < 10) {
        const base = 20 + index * 3;
        const options = [base - 1, base + 2, base + 5, base - 4];
        const correct = Math.max(...options);
        questions.push(
          makeChoiceQuestion(
            section,
            "Which number is greatest?",
            String(correct),
            options.filter((value) => value !== correct).map(String),
            greatestNumberExplanation(correct, options),
            "",
            2400 + index,
          ),
        );
      } else if (index < 15) {
        const value = 12 + (index - 10) * 4;
        const correct = value / 2;
        questions.push(
          makeNumericQuestion(
            section,
            `What is half of ${value}?`,
            correct,
            `Half of ${value} is ${correct}.`,
            2400 + index,
          ),
        );
      } else {
        const evenNumber = 18 + (index - 15) * 4;
        const oddOne = evenNumber + 1;
        const options = [evenNumber, oddOne + 2, oddOne + 4, oddOne + 6];
        questions.push(
          makeChoiceQuestion(
            section,
            "Which number is even?",
            String(evenNumber),
            options.filter((value) => value !== evenNumber).map(String),
            `${evenNumber} is even because it can be divided by 2 with no remainder.`,
            "",
            2400 + index,
          ),
        );
      }
    }

    questions.push(...buildMathChallengeQuestions(section));

    return questions;
  }

  function buildNonverbalQuestions() {
    const section = SECTIONS[2];
    const questions = [];
    const tokens = ["O", "[]", "/\\", "*", "<>"];
    const names = ["circle", "square", "triangle", "star", "diamond"];
    const fills = [
      ["outline circle", "filled circle"],
      ["outline square", "filled square"],
      ["outline triangle", "filled triangle"],
      ["outline star", "filled star"],
      ["outline diamond", "filled diamond"],
    ];
    const sizes = [
      ["small circle", "big circle"],
      ["small square", "big square"],
      ["small triangle", "big triangle"],
      ["small star", "big star"],
      ["small diamond", "big diamond"],
    ];

    for (let index = 0; index < 25; index += 1) {
      let correct = "";
      let stimulus = "";
      let distractors = [];

      if (index < 10) {
        const first = tokens[index % tokens.length];
        const second = tokens[(index + 1) % tokens.length];
        correct = second;
        stimulus = `${first}  ${second}  ${first}  ${second}  ${first}  ?`;
        distractors = tokens.filter((token) => token !== correct).slice(0, 3);
      } else if (index < 18) {
        const first = tokens[index % tokens.length];
        const second = tokens[(index + 2) % tokens.length];
        correct = second;
        stimulus = `${first}  ${first}  ${second}  ${first}  ${first}  ?`;
        distractors = tokens.filter((token) => token !== correct).slice(0, 3);
      } else {
        const first = tokens[index % tokens.length];
        const second = tokens[(index + 1) % tokens.length];
        const third = tokens[(index + 2) % tokens.length];
        correct = third;
        stimulus = `${first}  ${second}  ${third}  ${first}  ${second}  ?`;
        distractors = tokens.filter((token) => token !== correct).slice(0, 3);
      }

      questions.push(
        makeChoiceQuestion(
          section,
          "What comes next in the pattern?",
          correct,
          distractors,
          repeatingPatternExplanation(stimulus, correct, "symbol"),
          stimulus,
          3000 + index,
        ),
      );
    }

    for (let index = 0; index < 25; index += 1) {
      if (index < 10) {
        const correct = `big ${names[index % names.length]}`;
        const distractors = [
          `small ${names[(index + 1) % names.length]}`,
          `small ${names[(index + 2) % names.length]}`,
          `small ${names[(index + 3) % names.length]}`,
        ];
        questions.push(
          makeChoiceQuestion(
            section,
            "Which one does not belong?",
            correct,
            distractors,
            `${correct} is the only big shape while the others are small.`,
            "",
            3100 + index,
          ),
        );
      } else if (index < 18) {
        const group = sizes[index % sizes.length];
        const oddGroup = sizes[(index + 1) % sizes.length];
        questions.push(
          makeChoiceQuestion(
            section,
            "Which one does not belong?",
            oddGroup[1],
            [group[0], sizes[(index + 2) % sizes.length][0], sizes[(index + 3) % sizes.length][0]],
            `${oddGroup[1]} is the only one that is not small like the others.`,
            "",
            3100 + index,
          ),
        );
      } else {
        const group = fills[index % fills.length];
        const oddGroup = fills[(index + 1) % fills.length];
        questions.push(
          makeChoiceQuestion(
            section,
            "Which one does not belong?",
            oddGroup[1],
            [group[0], fills[(index + 2) % fills.length][0], fills[(index + 3) % fills.length][0]],
            `${oddGroup[1]} is the only filled shape while the others are outline shapes.`,
            "",
            3100 + index,
          ),
        );
      }
    }

    for (let index = 0; index < 25; index += 1) {
      if (index < 9) {
        const group = sizes[index % sizes.length];
        const nextGroup = sizes[(index + 1) % sizes.length];
        questions.push(
          makeChoiceQuestion(
            section,
            `${group[0]} becomes ${group[1]}. ${nextGroup[0]} becomes ...`,
            nextGroup[1],
            [nextGroup[0], group[1], group[0]],
            `The rule changes the size from small to big, so ${nextGroup[0]} becomes ${nextGroup[1]}.`,
            "",
            3200 + index,
          ),
        );
      } else if (index < 17) {
        const group = fills[index % fills.length];
        const nextGroup = fills[(index + 1) % fills.length];
        questions.push(
          makeChoiceQuestion(
            section,
            `${group[0]} becomes ${group[1]}. ${nextGroup[0]} becomes ...`,
            nextGroup[1],
            [nextGroup[0], group[1], group[0]],
            `The rule turns each outline shape into the same filled shape, so ${nextGroup[0]} becomes ${nextGroup[1]}.`,
            "",
            3200 + index,
          ),
        );
      } else {
        const shape = names[index % names.length];
        const nextShape = names[(index + 1) % names.length];
        const correct = `2 ${nextShape}s`;
        questions.push(
          makeChoiceQuestion(
            section,
            `1 ${shape} becomes 2 ${shape}s. 1 ${nextShape} becomes ...`,
            correct,
            [`1 ${nextShape}`, `3 ${nextShape}s`, `2 ${shape}s`],
            `The rule doubles the number of the same shape, so 1 ${nextShape} becomes 2 ${nextShape}s.`,
            "",
            3200 + index,
          ),
        );
      }
    }

    const arrowDirections = ["up", "right", "down", "left"];
    const arrowMap = {
      up: "north",
      right: "east",
      down: "south",
      left: "west",
    };
    const reverseArrowMap = {
      north: "up",
      east: "right",
      south: "down",
      west: "left",
    };

    for (let index = 0; index < 25; index += 1) {
      const start = arrowDirections[index % arrowDirections.length];
      const next = arrowDirections[(index + 1) % arrowDirections.length];
      const rule = index % 3 === 0 ? "right" : index % 3 === 1 ? "left" : "opposite";
      const changedStart = reverseArrowMap[rotateDirection(arrowMap[start], rule)];
      const changedNext = reverseArrowMap[rotateDirection(arrowMap[next], rule)];
      const promptRule = rule === "opposite" ? "points the opposite way" : `turns ${rule}`;

      questions.push(
        makeChoiceQuestion(
          section,
          `${start} arrow ${promptRule} and becomes ${changedStart}. ${next} arrow becomes ...`,
          changedNext,
          arrowDirections.filter((direction) => direction !== changedNext),
          `The rule is that every arrow ${promptRule}. So the ${next} arrow also ${promptRule} and becomes ${changedNext}.`,
          "",
          3300 + index,
        ),
      );
    }

    questions.push(...buildNonverbalChallengeQuestions(section));

    return questions;
  }

  function generateGridQuestions(section, size, count, seedBase) {
    const grid = buildGrid(size);
    const gridText = formatRows(grid.map((row) => row.join("   ")));
    const labels = allGridLabels(grid);
    const moveLookup = {
      up: { row: -1, col: 0 },
      down: { row: 1, col: 0 },
      left: { row: 0, col: -1 },
      right: { row: 0, col: 1 },
    };
    const patterns = [
      ["up", "right"],
      ["up", "left"],
      ["down", "right"],
      ["down", "left"],
      ["right", "right"],
      ["left", "left"],
      ["up", "up"],
      ["down", "down"],
      ["right", "down", "left"],
      ["left", "down", "right"],
      ["up", "right", "down"],
      ["down", "left", "up"],
      ["right", "up", "right"],
      ["left", "up", "left"],
      ["down", "right", "down"],
      ["up", "left", "up"],
    ];
    const candidates = [];

    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        for (const pattern of patterns) {
          let position = { row, col };
          let valid = true;

          for (const step of pattern) {
            position = moveOnGrid(position, moveLookup[step]);
            if (position.row < 0 || position.row >= size || position.col < 0 || position.col >= size) {
              valid = false;
              break;
            }
          }

          if (!valid) {
            continue;
          }

          const correct = gridLabel(grid, position.row, position.col);
          const wrongOptions = seededShuffle(labels.filter((label) => label !== correct), seedBase + candidates.length);
          const prompt = `Use the grid. Start at ${gridLabel(grid, row, col)}. Move ${pattern.join(", then ")}. Where do you end?`;

          candidates.push(
            makeChoiceQuestion(
              section,
              prompt,
              correct,
              wrongOptions.slice(0, 3),
              `Following the moves step by step lands on ${correct}.`,
              gridText,
              seedBase + candidates.length,
            ),
          );
        }
      }
    }

    return seededShuffle(candidates, seedBase).slice(0, count);
  }

  function buildSpatialQuestions() {
    const section = SECTIONS[3];
    const questions = [];

    questions.push(...generateGridQuestions(section, 3, 25, 4000));
    questions.push(...generateGridQuestions(section, 4, 25, 5000));

    const directions = ["north", "east", "south", "west"];
    const displayDirections = {
      north: "North",
      east: "East",
      south: "South",
      west: "West",
    };

    for (let index = 0; index < 50; index += 1) {
      const start = directions[index % directions.length];
      const turns = [];
      const turnCount = index < 25 ? 2 : 3;
      let current = start;

      for (let step = 0; step < turnCount; step += 1) {
        const turn = step % 2 === 0 ? (index % 3 === 0 ? "right" : "left") : (index % 4 === 0 ? "right" : "opposite");
        turns.push(turn);
        current = rotateDirection(current, turn);
      }

      questions.push(
        makeChoiceQuestion(
          section,
          `A rocket starts facing ${displayDirections[start]}. It turns ${turns.join(", then ")}. Which way does it face now?`,
          displayDirections[current],
          directions.filter((direction) => direction !== current).map((direction) => displayDirections[direction]),
          `Turn by turn, the rocket ends up facing ${displayDirections[current]}.`,
          "",
          6000 + index,
        ),
      );
    }

    questions.push(...buildSpatialChallengeQuestions(section));

    return questions;
  }

  function buildPatternQuestions() {
    const section = SECTIONS[4];
    const questions = [];
    const symbols = ["●", "■", "▲", "★", "◆", "○", "□", "△", "☆", "◇"];

    function symbolDistractors(correct, seed) {
      return seededShuffle(symbols.filter((symbol) => symbol !== correct), seed).slice(0, 3);
    }

    for (let index = 0; index < 10; index += 1) {
      const first = symbols[index % symbols.length];
      const second = symbols[(index + 1) % symbols.length];
      const stimulus = `${first}  ${second}  ${first}  ${second}  ${first}  ?`;

      questions.push(
        makeChoiceQuestion(
          section,
          "What comes next in the pattern?",
          second,
          symbolDistractors(second, 7000 + index),
          `${first} and ${second} alternate, so the next symbol is ${second}.`,
          stimulus,
          7000 + index,
        ),
      );
    }

    for (let index = 0; index < 10; index += 1) {
      const first = symbols[index % symbols.length];
      const second = symbols[(index + 2) % symbols.length];
      const stimulus = `${first}  ${first}  ${second}  ${first}  ${first}  ?`;

      questions.push(
        makeChoiceQuestion(
          section,
          "What comes next in the pattern?",
          second,
          symbolDistractors(second, 7100 + index),
          `The pattern repeats ${first}, ${first}, ${second}, so the next symbol is ${second}.`,
          stimulus,
          7100 + index,
        ),
      );
    }

    for (let index = 0; index < 10; index += 1) {
      const first = symbols[index % symbols.length];
      const second = symbols[(index + 1) % symbols.length];
      const third = symbols[(index + 2) % symbols.length];
      const stimulus = `${first}  ${second}  ${third}  ${first}  ${second}  ?`;

      questions.push(
        makeChoiceQuestion(
          section,
          "What comes next in the pattern?",
          third,
          symbolDistractors(third, 7200 + index),
          `The three-symbol block repeats, so the next symbol is ${third}.`,
          stimulus,
          7200 + index,
        ),
      );
    }

    for (let index = 0; index < 10; index += 1) {
      const first = symbols[index % symbols.length];
      const second = symbols[(index + 1) % symbols.length];
      const third = symbols[(index + 2) % symbols.length];
      const stimulus = `${first}  ${second}  ${third}  ${second}  ${first}  ${second}  ${third}  ?`;

      questions.push(
        makeChoiceQuestion(
          section,
          "What comes next in the pattern?",
          second,
          symbolDistractors(second, 7300 + index),
          `The four-symbol block repeats, so the next symbol is ${second}.`,
          stimulus,
          7300 + index,
        ),
      );
    }

    for (let index = 0; index < 10; index += 1) {
      const first = symbols[index % symbols.length];
      const second = symbols[(index + 1) % symbols.length];
      const third = symbols[(index + 2) % symbols.length];
      const fourth = symbols[(index + 3) % symbols.length];
      const stimulus = `${first}  ${second}  ${third}  ${fourth}  ${first}  ${second}  ${third}  ?`;

      questions.push(
        makeChoiceQuestion(
          section,
          "What comes next in the pattern?",
          fourth,
          symbolDistractors(fourth, 7400 + index),
          `The four-symbol block repeats, so the next symbol is ${fourth}.`,
          stimulus,
          7400 + index,
        ),
      );
    }

    const numberRules = [
      {
        seedBase: 7500,
        build(index) {
          const first = 2 + index;
          const second = 5 + index;
          const third = 8 + index;

          return {
            correct: third + 2,
            explanation: "Each output is 2 more than the input.",
            stimulus: formatRows([
              `${first} -> ${first + 2}`,
              `${second} -> ${second + 2}`,
              `${third} -> ?`,
            ]),
          };
        },
      },
      {
        seedBase: 7600,
        build(index) {
          const first = 3 + index;
          const second = 6 + index;
          const third = 9 + index;

          return {
            correct: third + 3,
            explanation: "Each output is 3 more than the input.",
            stimulus: formatRows([
              `${first} -> ${first + 3}`,
              `${second} -> ${second + 3}`,
              `${third} -> ?`,
            ]),
          };
        },
      },
      {
        seedBase: 7700,
        build(index) {
          const first = 7 + index;
          const second = 10 + index;
          const third = 13 + index;

          return {
            correct: third - 2,
            explanation: "Each output is 2 less than the input.",
            stimulus: formatRows([
              `${first} -> ${first - 2}`,
              `${second} -> ${second - 2}`,
              `${third} -> ?`,
            ]),
          };
        },
      },
      {
        seedBase: 7800,
        build(index) {
          const first = 2 + index;
          const second = 4 + index;
          const third = 6 + index;

          return {
            correct: third * 2,
            explanation: "Each output is double the input.",
            stimulus: formatRows([
              `${first} -> ${first * 2}`,
              `${second} -> ${second * 2}`,
              `${third} -> ?`,
            ]),
          };
        },
      },
      {
        seedBase: 7900,
        build(index) {
          const first = 1 + index;
          const second = 3 + index;
          const third = 5 + index;

          return {
            correct: third * 3,
            explanation: "Each output is triple the input.",
            stimulus: formatRows([
              `${first} -> ${first * 3}`,
              `${second} -> ${second * 3}`,
              `${third} -> ?`,
            ]),
          };
        },
      },
    ];

    numberRules.forEach((rule, ruleIndex) => {
      for (let index = 0; index < 10; index += 1) {
        const { correct, explanation, stimulus } = rule.build(index);

        questions.push(
          makeNumericQuestion(
            section,
            "Use the same rule in each row. What number should replace the question mark?",
            correct,
            explanation,
            rule.seedBase + index + ruleIndex * 10,
            stimulus,
          ),
        );
      }
    });

    questions.push(...buildPatternChallengeQuestions(section));

    return questions;
  }

  function buildAnalogicalQuestions() {
    const section = SECTIONS[5];
    const families = [
      [
        ["bird", "nest"],
        ["bee", "hive"],
        ["dog", "kennel"],
        ["horse", "stable"],
        ["fox", "den"],
        ["rabbit", "burrow"],
        ["ant", "hill"],
        ["cow", "barn"],
        ["spider", "web"],
        ["bear", "cave"],
      ],
      [
        ["scissors", "cut"],
        ["pencil", "write"],
        ["brush", "paint"],
        ["broom", "sweep"],
        ["key", "unlock"],
        ["ruler", "measure"],
        ["shovel", "dig"],
        ["needle", "sew"],
        ["spoon", "stir"],
        ["binoculars", "see"],
      ],
      [
        ["kitten", "cat"],
        ["puppy", "dog"],
        ["calf", "cow"],
        ["foal", "horse"],
        ["chick", "chicken"],
        ["cub", "bear"],
        ["duckling", "duck"],
        ["lamb", "sheep"],
        ["gosling", "goose"],
        ["piglet", "pig"],
      ],
      [
        ["petal", "flower"],
        ["page", "book"],
        ["wheel", "car"],
        ["toe", "foot"],
        ["finger", "hand"],
        ["branch", "tree"],
        ["roof", "house"],
        ["key", "piano"],
        ["handle", "cup"],
        ["tail", "kite"],
      ],
      [
        ["book", "library"],
        ["plane", "airport"],
        ["boat", "harbor"],
        ["painting", "museum"],
        ["food", "refrigerator"],
        ["clothes", "closet"],
        ["money", "wallet"],
        ["dishes", "cabinet"],
        ["car", "garage"],
        ["mail", "mailbox"],
      ],
    ];

    const questions = [];

    families.forEach((family, familyIndex) => {
      for (let index = 0; index < family.length; index += 1) {
        const left = family[index];
        const right = family[(index + 1) % family.length];
        const allSeconds = uniqueValues(family.map((pair) => pair[1]));
        const allFirsts = uniqueValues(family.map((pair) => pair[0]));

        questions.push(
          makeChoiceQuestion(
            section,
            `${left[0]} is to ${left[1]} as ${right[0]} is to ...`,
            right[1],
            allSeconds.filter((value) => value !== right[1]).slice(0, 3),
            `${right[0]} matches with ${right[1]} in the same way ${left[0]} matches with ${left[1]}.`,
            "",
            8000 + familyIndex * 100 + index,
          ),
        );

        questions.push(
          makeChoiceQuestion(
            section,
            `${left[1]} is to ${left[0]} as ${right[1]} is to ...`,
            right[0],
            allFirsts.filter((value) => value !== right[0]).slice(0, 3),
            `${right[1]} matches with ${right[0]} in the same reverse way.`,
            "",
            8050 + familyIndex * 100 + index,
          ),
        );
      }
    });

    questions.push(...buildAnalogyChallengeQuestions(section));

    return questions;
  }

  function buildClassificationQuestions() {
    const section = SECTIONS[6];
    const categories = {
      Fruits: ["apple", "banana", "grape", "pear", "orange"],
      Vehicles: ["car", "bus", "train", "boat", "plane"],
      Furniture: ["chair", "table", "sofa", "bed", "desk"],
      Clothing: ["shirt", "pants", "coat", "hat", "sock"],
      "School Supplies": ["pencil", "eraser", "notebook", "marker", "glue"],
      Tools: ["hammer", "saw", "wrench", "shovel", "drill"],
      Shapes: ["circle", "square", "triangle", "rectangle", "oval"],
      "Days of the Week": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      Months: ["January", "March", "May", "July", "October"],
      "Musical Instruments": ["drum", "piano", "violin", "flute", "guitar"],
      "Body Parts": ["hand", "foot", "knee", "elbow", "shoulder"],
      "Weather Words": ["rain", "snow", "wind", "fog", "storm"],
    };

    const categoryNames = Object.keys(categories);
    const questions = [];

    for (let index = 0; index < 50; index += 1) {
      const category = categoryNames[index % categoryNames.length];
      const oddCategory = categoryNames[(index + 3) % categoryNames.length];
      const sameGroup = categories[category];
      const oddGroup = categories[oddCategory];
      const correct = oddGroup[index % oddGroup.length];
      const distractors = [
        sameGroup[index % sameGroup.length],
        sameGroup[(index + 1) % sameGroup.length],
        sameGroup[(index + 2) % sameGroup.length],
      ];

      questions.push(
        makeChoiceQuestion(
          section,
          "Which word does not belong with the others?",
          correct,
          distractors,
          `${correct} is from ${oddCategory}, while the others are all ${category}.`,
          "",
          9000 + index,
        ),
      );
    }

    for (let index = 0; index < 50; index += 1) {
      const category = categoryNames[index % categoryNames.length];
      const item = categories[category][index % categories[category].length];
      const distractors = categoryNames.filter((name) => name !== category).slice(index % 3, index % 3 + 3);

      questions.push(
        makeChoiceQuestion(
          section,
          `Which group does "${item}" belong to?`,
          category,
          distractors,
          groupExplanation(item, category),
          "",
          9100 + index,
        ),
      );
    }

    questions.push(...buildCategoryChallengeQuestions(section));

    return questions;
  }

  function buildLogicalQuestions() {
    const section = SECTIONS[7];
    const questions = [];
    const events = ["breakfast", "reading", "math", "art", "lunch", "recess", "music", "bedtime"];
    const names = ["Mia", "Ben", "Ava", "Leo", "Nora", "Sam", "Ella", "Jay"];
    const nonsense = ["zib", "mip", "tov", "lax", "pim", "bex", "dor", "vup"];
    const attributes = ["blue", "striped", "round", "soft", "sparkly", "tiny", "green", "wooden"];

    for (let index = 0; index < 25; index += 1) {
      const first = events[index % events.length];
      const second = events[(index + 1) % events.length];
      const third = events[(index + 2) % events.length];
      const ask = index % 3 === 0 ? "first" : index % 3 === 1 ? "last" : "second";
      const correct = ask === "first" ? first : ask === "last" ? third : second;

      questions.push(
        makeChoiceQuestion(
          section,
          `${first} happened before ${second}. ${second} happened before ${third}. What happened ${ask}?`,
          correct,
          [first, second, third].filter((value) => value !== correct).concat("not enough information").slice(0, 3),
          `The order is ${first}, then ${second}, then ${third}.`,
          "",
          10000 + index,
        ),
      );
    }

    for (let index = 0; index < 25; index += 1) {
      const tallest = names[index % names.length];
      const middle = names[(index + 1) % names.length];
      const shortest = names[(index + 2) % names.length];
      const askTallest = index % 2 === 0;
      const correct = askTallest ? tallest : shortest;

      questions.push(
        makeChoiceQuestion(
          section,
          `${tallest} is taller than ${middle}. ${middle} is taller than ${shortest}. Who is ${askTallest ? "tallest" : "shortest"}?`,
          correct,
          [tallest, middle, shortest, names[(index + 3) % names.length]].filter((value) => value !== correct).slice(0, 3),
          `If ${tallest} is taller than ${middle} and ${middle} is taller than ${shortest}, the order is clear.`,
          "",
          10100 + index,
        ),
      );
    }

    for (let index = 0; index < 25; index += 1) {
      const madeUpWord = nonsense[index % nonsense.length];
      const name = names[(index + 3) % names.length];
      const attribute = attributes[index % attributes.length];
      const result = attributes[(index + 2) % attributes.length];

      questions.push(
        makeChoiceQuestion(
          section,
          `All ${madeUpWord}s are ${attribute}. All ${attribute} things are ${result}. ${name} has a ${madeUpWord}. What must be true?`,
          `${name} has something ${result}.`,
          [
            `${name} has something red.`,
            `Everything ${result} is a ${madeUpWord}.`,
            `${name} does not have a ${madeUpWord}.`,
          ],
          `If every ${madeUpWord} is ${attribute}, and every ${attribute} thing is ${result}, then ${name}'s ${madeUpWord} must be ${result}.`,
          "",
          10200 + index,
        ),
      );
    }

    for (let index = 0; index < 25; index += 1) {
      const first = names[index % names.length];
      const second = names[(index + 1) % names.length];
      const third = names[(index + 2) % names.length];
      const order = [first, second, third];
      const ask = index % 3 === 0 ? "first" : index % 3 === 1 ? "middle" : "last";
      const correct = ask === "first" ? order[0] : ask === "middle" ? order[1] : order[2];

      questions.push(
        makeChoiceQuestion(
          section,
          `${order[1]} is after ${order[0]}. ${order[2]} is after ${order[1]}. Who is ${ask} in line?`,
          correct,
          [order[0], order[1], order[2], "not enough information"].filter((value) => value !== correct).slice(0, 3),
          `The line order is ${order[0]}, then ${order[1]}, then ${order[2]}.`,
          "",
          10300 + index,
        ),
      );
    }

    questions.push(...buildLogicChallengeQuestions(section));

    return questions;
  }

  function buildVerbalChallengeQuestions(section) {
    const questions = [];
    const synonymSet = [
      ["enormous", "huge", ["tiny", "plain", "shallow"]],
      ["fragile", "delicate", ["muddy", "noisy", "sleepy"]],
      ["observe", "watch", ["cover", "pack", "ignore"]],
      ["purchase", "buy", ["hide", "wrap", "sell"]],
      ["rapid", "fast", ["heavy", "damp", "sleepy"]],
      ["ancient", "old", ["modern", "narrow", "swift"]],
      ["delighted", "pleased", ["worried", "jagged", "empty"]],
      ["repair", "fix", ["break", "visit", "toss"]],
      ["fortunate", "lucky", ["angry", "crooked", "wooden"]],
      ["respond", "answer", ["listen", "wander", "climb"]],
    ];
    const antonymSet = [
      ["ancient", "modern", ["quiet", "lucky", "timid"]],
      ["expand", "shrink", ["measure", "giggle", "travel"]],
      ["include", "exclude", ["borrow", "collect", "discover"]],
      ["polite", "rude", ["patient", "fragile", "tidy"]],
      ["victory", "defeat", ["courage", "thunder", "basket"]],
      ["scarce", "plentiful", ["narrow", "sleepy", "helpful"]],
      ["arrive", "depart", ["search", "cover", "explain"]],
      ["private", "public", ["silent", "cloudy", "narrow"]],
    ];
    const contextSet = [
      [
        "The puppy was so ___ after the long walk that it fell asleep on the car ride home.",
        "drowsy",
        ["fragile", "rapid", "ancient"],
      ],
      [
        "Mia used a magnifying glass to ___ the tiny shells on the beach.",
        "observe",
        ["purchase", "repair", "include"],
      ],
      [
        "The glass ornament was ___, so Dad wrapped it in soft paper.",
        "fragile",
        ["modern", "cheerful", "sturdy"],
      ],
      [
        "After the team won the final game, everyone celebrated the big ___.",
        "victory",
        ["shadow", "whisper", "arrival"],
      ],
      [
        "Grandpa showed us an ___ coin from more than one hundred years ago.",
        "ancient",
        ["rapid", "cloudy", "narrow"],
      ],
      [
        "The hallway looked ___ during the storm because only one lamp was on.",
        "gloomy",
        ["lucky", "honest", "simple"],
      ],
      [
        "Leah needed to ___ her torn backpack strap before school.",
        "repair",
        ["borrow", "discover", "include"],
      ],
      [
        "Sofia felt ___ when her lost kitten came back home.",
        "fortunate",
        ["fragile", "rapid", "ancient"],
      ],
    ];
    const reasoningSet = [
      [
        "If a trail is steep, what is probably true?",
        "It is hard to climb.",
        ["It is made of glass.", "It is underwater.", "It is very short."],
        "A steep trail rises sharply, so it takes extra effort to climb.",
      ],
      [
        "If a glass is transparent, what can you do through it?",
        "See through it.",
        ["Cook with it.", "Plant it.", "Bend it like cloth."],
        "Transparent means light passes through it, so you can see through the glass.",
      ],
      [
        "If an author writes a sequel, what has the author already written?",
        "Another book in the same series.",
        ["A recipe for dinner.", "A list of chores.", "A map of the town."],
        "A sequel continues an earlier story, so there must already be another book in the same series.",
      ],
      [
        "If a rule is fair, how does it treat people?",
        "It treats people the same way.",
        ["It changes every minute.", "It only helps adults.", "It hides the answer."],
        "A fair rule treats people equally instead of giving one group an unfair advantage.",
      ],
      [
        "If a machine starts rattling and smoking, what should happen next?",
        "Someone should check it right away.",
        ["It should be painted blue.", "It should be buried.", "It should be used faster."],
        "Rattling and smoke are warning signs, so the safest choice is to check the machine right away.",
      ],
      [
        "If a map shows a dotted line to a campsite, what is the line most likely showing?",
        "The trail to follow.",
        ["The tallest tree.", "The weather tomorrow.", "The name of the river."],
        "On maps, a dotted line usually marks the path or trail you should follow to reach a place.",
      ],
      [
        "If an animal is nocturnal, when is it usually awake?",
        "At night.",
        ["Only at noon.", "Only in winter.", "Only during storms."],
        "Nocturnal animals are active at night and usually rest during the day.",
      ],
      [
        "If a package is labeled fragile, how should it be handled?",
        "Carefully.",
        ["As loudly as possible.", "Only upside down.", "As fast as possible."],
        "Fragile means easy to break, so the package should be handled carefully.",
      ],
    ];

    synonymSet.forEach(([word, correct, distractors], index) => {
      questions.push(
        makeChoiceQuestion(
          section,
          `Which word means almost the same as "${word}"?`,
          correct,
          distractors,
          synonymExplanation(word, correct),
          "",
          1400 + index,
        ),
      );
    });

    antonymSet.forEach(([word, correct, distractors], index) => {
      questions.push(
        makeChoiceQuestion(
          section,
          `Which word means the opposite of "${word}"?`,
          correct,
          distractors,
          antonymExplanation(word, correct),
          "",
          1500 + index,
        ),
      );
    });

    contextSet.forEach(([prompt, correct, distractors], index) => {
      questions.push(
        makeChoiceQuestion(
          section,
          prompt,
          correct,
          distractors,
          completeSentenceExplanation(prompt, correct),
          "",
          1600 + index,
        ),
      );
    });

    reasoningSet.forEach(([prompt, correct, distractors, explanation], index) => {
      questions.push(
        makeChoiceQuestion(
          section,
          prompt,
          correct,
          distractors,
          explanation,
          "",
          1700 + index,
        ),
      );
    });

    return questions;
  }

  function buildMathChallengeQuestions(section) {
    const questions = [];
    const regroupSet = [
      ["What is 47 + 26?", 73],
      ["What is 83 - 47?", 36],
      ["What is 58 + 19?", 77],
      ["What is 94 - 38?", 56],
      ["What is 36 + 27?", 63],
      ["What is 72 - 29?", 43],
      ["What is 65 + 18?", 83],
      ["What is 81 - 46?", 35],
      ["What is 29 + 37?", 66],
      ["What is 90 - 57?", 33],
    ];
    const multiplicationSet = [
      ["What is 6 x 4?", 24, "6 groups of 4 make 24."],
      ["What is 7 x 5?", 35, "7 groups of 5 make 35."],
      ["What is 8 x 3?", 24, "8 groups of 3 make 24."],
      ["What is 9 x 4?", 36, "9 groups of 4 make 36."],
      ["There are 5 rows with 6 chairs in each row. How many chairs are there?", 30, "5 rows of 6 chairs make 30 chairs."],
      ["There are 4 boxes with 8 crayons in each box. How many crayons are there?", 32, "4 boxes of 8 crayons make 32 crayons."],
      ["Three teams each have 9 players. How many players are there in all?", 27, "3 groups of 9 make 27."],
      ["For 7 days in a row, Liam earns 6 stickers each day. How many stickers does he earn?", 42, "7 groups of 6 make 42."],
    ];
    const divisionSet = [
      ["What is 24 / 6?", 4, "24 split into 6 equal groups gives 4 in each group."],
      ["What is 35 / 5?", 7, "35 split into 5 equal groups gives 7 in each group."],
      ["What is 42 / 7?", 6, "42 split into 7 equal groups gives 6 in each group."],
      ["What is 56 / 8?", 7, "56 split into 8 equal groups gives 7 in each group."],
      ["32 apples are shared equally among 4 baskets. How many apples go in each basket?", 8, "32 divided by 4 equals 8."],
      ["27 stickers are shared equally among 3 friends. How many stickers does each friend get?", 9, "27 divided by 3 equals 9."],
      ["45 blocks are stacked equally into 5 towers. How many blocks are in each tower?", 9, "45 divided by 5 equals 9."],
      ["36 pencils are placed equally into 6 cups. How many pencils go in each cup?", 6, "36 divided by 6 equals 6."],
    ];
    const wordProblemSet = [
      ["Mila saved 35 cents on Monday and 27 cents on Tuesday. How many cents did she save in all?", 62, "Add the two amounts: 35 + 27 = 62, so Mila saved 62 cents in all."],
      ["A ribbon is 48 inches long. Then 15 inches are cut off and 9 more inches are cut off. How many inches remain?", 24, "Start with 48 inches, subtract 15, then subtract 9 more: 48 - 15 - 9 = 24."],
      ["A rectangle has sides that are 6 inches and 4 inches long. What is its perimeter?", 20, "A rectangle has two 6-inch sides and two 4-inch sides, so 6 + 4 + 6 + 4 = 20."],
      ["There are 4 tables with 7 pencils on each table, and the teacher adds 6 more pencils. How many pencils are there now?", 34, "First find the pencils on the tables: 4 x 7 = 28. Then add 6 more to get 34."],
      ["A jar has 54 beads. If 18 are blue, how many are red?", 36, "Take the 18 blue beads away from the 54 total beads: 54 - 18 = 36 red beads."],
      ["Three friends each read 12 pages on Monday. How many pages did they read altogether?", 36, "There are 3 equal groups of 12 pages, so 3 x 12 = 36 pages altogether."],
      ["A store sold 45 apples in the morning and 28 apples in the afternoon. How many apples did it sell?", 73, "Add the morning and afternoon sales: 45 + 28 = 73 apples."],
      ["There are 63 stickers shared equally among 9 students. How many stickers does each student get?", 7, "Share 63 stickers equally among 9 students: 63 / 9 = 7 each."],
    ];

    regroupSet.forEach(([prompt, correct], index) => {
      questions.push(
        makeNumericQuestion(
          section,
          prompt,
          correct,
          `${prompt.replace("What is ", "").replace("?", "")} = ${correct}.`,
          2500 + index,
        ),
      );
    });

    multiplicationSet.forEach(([prompt, correct, explanation], index) => {
      questions.push(
        makeNumericQuestion(
          section,
          prompt,
          correct,
          explanation,
          2600 + index,
        ),
      );
    });

    divisionSet.forEach(([prompt, correct, explanation], index) => {
      questions.push(
        makeNumericQuestion(
          section,
          prompt,
          correct,
          explanation,
          2700 + index,
        ),
      );
    });

    wordProblemSet.forEach(([prompt, correct, explanation], index) => {
      questions.push(
        makeNumericQuestion(
          section,
          prompt,
          correct,
          explanation,
          2800 + index,
        ),
      );
    });

    return questions;
  }

  function buildNonverbalChallengeQuestions(section) {
    const questions = [];
    const shapes = ["circle", "square", "triangle", "star", "diamond", "rectangle", "hexagon", "oval"];

    for (let index = 0; index < 6; index += 1) {
      const first = shapes[index % shapes.length];
      const second = shapes[(index + 1) % shapes.length];
      const third = shapes[(index + 2) % shapes.length];

      questions.push(
        makeChoiceQuestion(
          section,
          "What comes next in the pattern?",
          `big ${third}`,
          [`small ${third}`, `big ${first}`, `small ${first}`],
          `The size changes small, big for each shape, so the next item is big ${third}.`,
          `small ${first} | big ${first} | small ${second} | big ${second} | small ${third} | ?`,
          3400 + index,
        ),
      );
    }

    for (let index = 0; index < 6; index += 1) {
      const first = shapes[(index + 2) % shapes.length];
      const second = shapes[(index + 3) % shapes.length];
      const third = shapes[(index + 4) % shapes.length];

      questions.push(
        makeChoiceQuestion(
          section,
          "What comes next in the pattern?",
          `filled ${third}`,
          [`outline ${third}`, `filled ${first}`, `outline ${first}`],
          `The fill changes outline, filled for each shape, so the next item is filled ${third}.`,
          `outline ${first} | filled ${first} | outline ${second} | filled ${second} | outline ${third} | ?`,
          3410 + index,
        ),
      );
    }

    for (let index = 0; index < 6; index += 1) {
      const first = shapes[(index + 1) % shapes.length];
      const second = shapes[(index + 5) % shapes.length];

      questions.push(
        makeChoiceQuestion(
          section,
          `small outline ${first} becomes big filled ${first}. small outline ${second} becomes ...`,
          `big filled ${second}`,
          [`small filled ${second}`, `big outline ${second}`, `big filled ${first}`],
          `The rule changes both the size and the fill, so small outline ${second} becomes big filled ${second}.`,
          "",
          3420 + index,
        ),
      );
    }

    for (let index = 0; index < 6; index += 1) {
      const first = shapes[(index + 3) % shapes.length];
      const second = shapes[(index + 6) % shapes.length];

      questions.push(
        makeChoiceQuestion(
          section,
          `1 ${first} becomes 3 ${first}s. 1 ${second} becomes ...`,
          `3 ${second}s`,
          [`2 ${second}s`, `3 ${first}s`, `1 ${second}`],
          `The rule triples the number of the same shape, so 1 ${second} becomes 3 ${second}s.`,
          "",
          3430 + index,
        ),
      );
    }

    for (let index = 0; index < 5; index += 1) {
      const first = shapes[index % shapes.length];
      const second = shapes[(index + 1) % shapes.length];
      const third = shapes[(index + 2) % shapes.length];

      questions.push(
        makeChoiceQuestion(
          section,
          "Which one does not belong?",
          `big filled ${first}`,
          [`small filled ${first}`, `small filled ${second}`, `small filled ${third}`],
          `big filled ${first} is the only choice that is big while the others are small filled shapes.`,
          "",
          3440 + index,
        ),
      );
    }

    for (let index = 0; index < 5; index += 1) {
      const first = shapes[(index + 2) % shapes.length];
      const second = shapes[(index + 3) % shapes.length];
      const third = shapes[(index + 4) % shapes.length];

      questions.push(
        makeChoiceQuestion(
          section,
          "Which one does not belong?",
          `outline ${first}`,
          [`filled ${first}`, `filled ${second}`, `filled ${third}`],
          `outline ${first} is the only outline shape while the others are filled.`,
          "",
          3450 + index,
        ),
      );
    }

    return questions;
  }

  function buildSpatialChallengeQuestions(section) {
    const questions = [];
    const directions = ["north", "east", "south", "west"];
    const displayDirections = {
      north: "North",
      east: "East",
      south: "South",
      west: "West",
    };
    const turnPatterns = [
      ["right", "left", "opposite", "right"],
      ["left", "opposite", "right", "left"],
      ["opposite", "right", "right", "left"],
      ["right", "right", "left", "opposite"],
      ["left", "left", "opposite", "right"],
      ["opposite", "left", "right", "right"],
      ["right", "opposite", "left", "left"],
      ["left", "right", "opposite", "opposite"],
      ["right", "left", "right", "left"],
      ["left", "right", "left", "right"],
      ["opposite", "right", "opposite", "left"],
      ["right", "opposite", "right", "opposite"],
      ["left", "opposite", "left", "opposite"],
      ["right", "left", "opposite", "left"],
    ];

    questions.push(...generateGridQuestions(section, 5, 20, 6100));

    turnPatterns.forEach((turns, index) => {
      const start = directions[index % directions.length];
      let current = start;

      turns.forEach((turn) => {
        current = rotateDirection(current, turn);
      });

      questions.push(
        makeChoiceQuestion(
          section,
          `A rocket starts facing ${displayDirections[start]}. It turns ${turns.join(", then ")}. Which way does it face now?`,
          displayDirections[current],
          directions.filter((direction) => direction !== current).map((direction) => displayDirections[direction]),
          `Following the turns in order leaves the rocket facing ${displayDirections[current]}.`,
          "",
          6200 + index,
        ),
      );
    });

    return questions;
  }

  function buildPatternChallengeQuestions(section) {
    const questions = [];
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    for (let index = 0; index < 6; index += 1) {
      const start = 3 + index;
      const sequence = [start, start + 2, start + 5, start + 9];
      const correct = start + 14;

      questions.push(
        makeNumericQuestion(
          section,
          "What number comes next in the pattern?",
          correct,
          "The pattern adds 2, then 3, then 4, so the next step adds 5.",
          8100 + index,
          `${sequence.join(", ")}, ?`,
        ),
      );
    }

    for (let index = 0; index < 6; index += 1) {
      const start = 30 + index * 2;
      const sequence = [start, start - 3, start - 7, start - 12];
      const correct = start - 18;

      questions.push(
        makeNumericQuestion(
          section,
          "What number comes next in the pattern?",
          correct,
          "The pattern subtracts 3, then 4, then 5, so the next step subtracts 6.",
          8110 + index,
          `${sequence.join(", ")}, ?`,
        ),
      );
    }

    for (let index = 0; index < 6; index += 1) {
      const start = index;
      const first = alphabet[start];
      const second = alphabet[start + 2];
      const third = alphabet[start + 4];
      const fourth = alphabet[start + 6];
      const correct = alphabet[start + 8];

      questions.push(
        makeChoiceQuestion(
          section,
          "What letter comes next in the pattern?",
          correct,
          pickDistractors(alphabet.split(""), correct, 3, 8200 + index),
          `The letters move forward by 2 each time: ${first}, ${second}, ${third}, ${fourth}, so the next letter is ${correct}.`,
          `${first}, ${second}, ${third}, ${fourth}, ?`,
          8200 + index,
        ),
      );
    }

    for (let index = 0; index < 6; index += 1) {
      const start = index + 1;
      const first = alphabet[start];
      const second = alphabet[start + 3];
      const third = alphabet[start + 6];
      const fourth = alphabet[start + 9];
      const correct = alphabet[start + 12];

      questions.push(
        makeChoiceQuestion(
          section,
          "What letter comes next in the pattern?",
          correct,
          pickDistractors(alphabet.split(""), correct, 3, 8210 + index),
          `The letters move forward by 3 each time: ${first}, ${second}, ${third}, ${fourth}, so the next letter is ${correct}.`,
          `${first}, ${second}, ${third}, ${fourth}, ?`,
          8210 + index,
        ),
      );
    }

    for (let index = 0; index < 5; index += 1) {
      const first = 2 + index;
      const second = 4 + index;
      const third = 6 + index;
      const correct = third * 2 + 1;

      questions.push(
        makeNumericQuestion(
          section,
          "Use the same rule in each row. What number should replace the question mark?",
          correct,
          "Each output is double the input, then 1 more.",
          8220 + index,
          formatRows([
            `${first} -> ${first * 2 + 1}`,
            `${second} -> ${second * 2 + 1}`,
            `${third} -> ?`,
          ]),
        ),
      );
    }

    for (let index = 0; index < 5; index += 1) {
      const first = 3 + index;
      const second = 5 + index;
      const third = 7 + index;
      const correct = third * 3 - 2;

      questions.push(
        makeNumericQuestion(
          section,
          "Use the same rule in each row. What number should replace the question mark?",
          correct,
          "Each output is triple the input, then 2 less.",
          8230 + index,
          formatRows([
            `${first} -> ${first * 3 - 2}`,
            `${second} -> ${second * 3 - 2}`,
            `${third} -> ?`,
          ]),
        ),
      );
    }

    return questions;
  }

  function buildAnalogyChallengeQuestions(section) {
    const family = [
      ["author", "book"],
      ["chef", "meal"],
      ["artist", "painting"],
      ["builder", "house"],
      ["baker", "bread"],
      ["composer", "song"],
      ["farmer", "crop"],
      ["teacher", "lesson"],
      ["carpenter", "table"],
      ["tailor", "shirt"],
      ["programmer", "app"],
      ["potter", "vase"],
      ["jeweler", "ring"],
      ["gardener", "garden"],
      ["scientist", "experiment"],
      ["poet", "poem"],
      ["inventor", "machine"],
    ];
    const allFirsts = uniqueValues(family.map((pair) => pair[0]));
    const allSeconds = uniqueValues(family.map((pair) => pair[1]));
    const questions = [];

    family.forEach((left, index) => {
      const right = family[(index + 1) % family.length];

      questions.push(
        makeChoiceQuestion(
          section,
          `${left[0]} is to ${left[1]} as ${right[0]} is to ...`,
          right[1],
          pickDistractors(allSeconds, right[1], 3, 8300 + index),
          `${right[0]} is matched with ${right[1]} in the same maker-to-product relationship.`,
          "",
          8300 + index,
        ),
      );

      questions.push(
        makeChoiceQuestion(
          section,
          `${left[1]} is to ${left[0]} as ${right[1]} is to ...`,
          right[0],
          pickDistractors(allFirsts, right[0], 3, 8400 + index),
          `${right[1]} is made by ${right[0]} in the same reverse relationship.`,
          "",
          8400 + index,
        ),
      );
    });

    return questions;
  }

  function buildCategoryChallengeQuestions(section) {
    const challengeCategories = {
      Mammals: ["dog", "whale", "tiger", "horse", "squirrel"],
      Birds: ["eagle", "robin", "penguin", "owl", "parrot"],
      Reptiles: ["snake", "turtle", "lizard", "crocodile", "iguana"],
      Insects: ["butterfly", "beetle", "ant", "dragonfly", "grasshopper"],
      Landforms: ["mountain", "valley", "canyon", "hill", "plateau"],
      "Bodies of Water": ["river", "lake", "ocean", "pond", "stream"],
      "Solid Shapes": ["cube", "sphere", "cone", "cylinder", "prism"],
      "Measurement Tools": ["ruler", "scale", "thermometer", "clock", "measuring cup"],
      "Natural Resources": ["water", "soil", "sunlight", "wind", "trees"],
      Communities: ["city", "suburb", "town", "village", "neighborhood"],
    };
    const categoryNames = Object.keys(challengeCategories);
    const questions = [];

    for (let index = 0; index < 17; index += 1) {
      const category = categoryNames[index % categoryNames.length];
      const oddCategory = categoryNames[(index + 3) % categoryNames.length];
      const sameGroup = challengeCategories[category];
      const oddGroup = challengeCategories[oddCategory];
      const correct = oddGroup[index % oddGroup.length];
      const distractors = [
        sameGroup[index % sameGroup.length],
        sameGroup[(index + 1) % sameGroup.length],
        sameGroup[(index + 2) % sameGroup.length],
      ];

      questions.push(
        makeChoiceQuestion(
          section,
          "Which word does not belong with the others?",
          correct,
          distractors,
          `${correct} belongs to ${oddCategory}, while the others are all in ${category}.`,
          "",
          8500 + index,
        ),
      );
    }

    for (let index = 0; index < 17; index += 1) {
      const category = categoryNames[index % categoryNames.length];
      const item = challengeCategories[category][index % challengeCategories[category].length];

      questions.push(
        makeChoiceQuestion(
          section,
          `Which group does "${item}" belong to?`,
          category,
          pickDistractors(categoryNames, category, 3, 8600 + index),
          groupExplanation(item, category),
          "",
          8600 + index,
        ),
      );
    }

    return questions;
  }

  function buildLogicChallengeQuestions(section) {
    const questions = [];
    const activities = ["reading", "science", "music", "art", "recess", "lunch", "math", "library", "spelling", "soccer"];
    const names = ["Mia", "Ben", "Ava", "Leo", "Nora", "Sam", "Ella", "Jay", "Ivy", "Owen"];
    const nonsense = ["zib", "mip", "tov", "lax", "pim", "bex", "dor", "vup", "nax", "rel"];
    const attributes = ["striped", "shiny", "bumpy", "green", "round", "soft", "wooden", "bright", "spotted", "smooth"];

    for (let index = 0; index < 12; index += 1) {
      const first = activities[index % activities.length];
      const second = activities[(index + 1) % activities.length];
      const third = activities[(index + 2) % activities.length];
      const fourth = activities[(index + 3) % activities.length];
      const ask = index % 4 === 0 ? "first" : index % 4 === 1 ? "second" : index % 4 === 2 ? "third" : "last";
      const correct = ask === "first" ? first : ask === "second" ? second : ask === "third" ? third : fourth;

      questions.push(
        makeChoiceQuestion(
          section,
          `${second} happened after ${first}. ${third} happened after ${second}. ${fourth} happened after ${third}. What happened ${ask}?`,
          correct,
          [first, second, third, fourth].filter((value) => value !== correct).slice(0, 3),
          `The order is ${first}, then ${second}, then ${third}, then ${fourth}.`,
          "",
          8700 + index,
        ),
      );
    }

    for (let index = 0; index < 10; index += 1) {
      const first = names[index % names.length];
      const second = names[(index + 1) % names.length];
      const third = names[(index + 2) % names.length];
      const fourth = names[(index + 3) % names.length];
      const ask = index % 4 === 0 ? "fastest" : index % 4 === 1 ? "slowest" : index % 4 === 2 ? "second" : "third";
      const correct = ask === "fastest" ? first : ask === "slowest" ? fourth : ask === "second" ? second : third;

      questions.push(
        makeChoiceQuestion(
          section,
          `${first} is faster than ${second}. ${second} is faster than ${third}. ${third} is faster than ${fourth}. Who is ${ask}?`,
          correct,
          [first, second, third, fourth].filter((value) => value !== correct).slice(0, 3),
          `The speed order is ${first}, ${second}, ${third}, ${fourth}.`,
          "",
          8800 + index,
        ),
      );
    }

    for (let index = 0; index < 12; index += 1) {
      const madeUpWord = nonsense[index % nonsense.length];
      const name = names[(index + 4) % names.length];
      const attributeOne = attributes[index % attributes.length];
      const attributeTwo = attributes[(index + 2) % attributes.length];
      const attributeThree = attributes[(index + 4) % attributes.length];

      questions.push(
        makeChoiceQuestion(
          section,
          `All ${madeUpWord}s are ${attributeOne}. All ${attributeOne} things are ${attributeTwo}. All ${attributeTwo} things are ${attributeThree}. ${name} has a ${madeUpWord}. What must be true?`,
          `${name} has something ${attributeThree}.`,
          [
            `${name} has something red.`,
            `Everything ${attributeThree} is a ${madeUpWord}.`,
            `${name} does not have a ${madeUpWord}.`,
          ],
          `Because every ${madeUpWord} is ${attributeOne}, every ${attributeOne} thing is ${attributeTwo}, and every ${attributeTwo} thing is ${attributeThree}, ${name}'s ${madeUpWord} must be ${attributeThree}.`,
          "",
          8900 + index,
        ),
      );
    }

    return questions;
  }

  function buildQuestionPool() {
    return {
      [SECTIONS[0]]: buildVerbalQuestions(),
      [SECTIONS[1]]: buildQuantitativeQuestions(),
      [SECTIONS[2]]: buildNonverbalQuestions(),
      [SECTIONS[3]]: buildSpatialQuestions(),
      [SECTIONS[4]]: buildPatternQuestions(),
      [SECTIONS[5]]: buildAnalogicalQuestions(),
      [SECTIONS[6]]: buildClassificationQuestions(),
      [SECTIONS[7]]: buildLogicalQuestions(),
    };
  }

  function validateQuestionPool(pool) {
    for (const section of SECTIONS) {
      const questions = pool[section];

      if (!Array.isArray(questions)) {
        throw new Error(`Missing question array for ${section}`);
      }

      if (questions.length !== QUESTIONS_PER_SECTION) {
        throw new Error(`Expected ${QUESTIONS_PER_SECTION} questions in ${section}, got ${questions.length}`);
      }

      questions.forEach((question, index) => {
        if (question.section !== section) {
          throw new Error(`Section mismatch in ${section} question ${index + 1}`);
        }

        if (!Array.isArray(question.options) || question.options.length !== 4) {
          throw new Error(`Question ${section} #${index + 1} does not have 4 options`);
        }

        if (uniqueValues(question.options).length !== 4) {
          throw new Error(`Question ${section} #${index + 1} has duplicate options`);
        }

        if (question.answer < 0 || question.answer > 3) {
          throw new Error(`Question ${section} #${index + 1} has invalid answer index`);
        }

        if (!question.prompt || !question.explanation) {
          throw new Error(`Question ${section} #${index + 1} is missing text`);
        }

        question.bankId = `${section}-${index + 1}`;
      });
    }
  }

  try {
    const QUESTION_POOL = assignBankQuestionIds(buildQuestionPool());
    validateQuestionPool(QUESTION_POOL);

    function buildTestSession() {
      const session = [];
      const historyBySection = loadQuestionHistory();
      const nextHistory = { ...historyBySection };

      SECTIONS.forEach((section) => {
        const sampledQuestions = selectQuestionsForSection(section, historyBySection, QUESTION_POOL);
        const answerSlots = buildAnswerSlotPlan(QUESTIONS_PER_TEST_SECTION);

        nextHistory[section] = mergeRecentQuestionIds(
          Array.isArray(historyBySection[section]) ? historyBySection[section] : [],
          sampledQuestions.map((question) => question.bankId),
        );

        sampledQuestions.forEach((question, questionIndex) => {
          const questionForSession = placeCorrectAnswer(question, answerSlots[questionIndex]);
          session.push({
            ...questionForSession,
            options: [...questionForSession.options],
            id: session.length + 1,
          });
        });
      });

      saveQuestionHistory(nextHistory);

      return session;
    }

    function cloneQuestionPool(pool) {
      const clone = {};

      SECTIONS.forEach((section) => {
        clone[section] = pool[section].map((question) => ({
          ...question,
          options: [...question.options],
        }));
      });

      return clone;
    }

    window.GiftedQuestionBank = Object.freeze({
      SECTIONS,
      QUESTIONS_PER_SECTION,
      QUESTIONS_PER_TEST_SECTION,
      buildTestSession,
      getQuestionPool() {
        return cloneQuestionPool(QUESTION_POOL);
      },
    });
  } catch (error) {
    window.GiftedQuestionBankError = error.message;
  }
})();
