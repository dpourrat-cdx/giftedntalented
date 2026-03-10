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

  const QUESTIONS_PER_SECTION = 100;
  const QUESTIONS_PER_TEST_SECTION = 8;

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

  function formatRows(rows) {
    return rows.join("\n");
  }

  function repeatSymbol(symbol, count) {
    return Array(count).fill(symbol).join(" ");
  }

  function formatMatrix(topLeft, topRight, bottomLeft, bottomRight = "?") {
    const values = [topLeft, topRight, bottomLeft, bottomRight].map(String);
    const width = values.reduce((max, value) => Math.max(max, value.length), 1);
    const pad = (value) => String(value).padEnd(width, " ");
    const divider = "─".repeat(width + 2);

    return formatRows([
      `┌${divider}┬${divider}┐`,
      `│ ${pad(topLeft)} │ ${pad(topRight)} │`,
      `├${divider}┼${divider}┤`,
      `│ ${pad(bottomLeft)} │ ${pad(bottomRight)} │`,
      `└${divider}┴${divider}┘`,
    ]);
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
      ["Which animal gives us wool?", "sheep", ["duck", "horse", "rabbit"]],
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
          `${correct} means nearly the same as ${word}.`,
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
          `${correct} is the opposite of ${word}.`,
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
          `${correct} is the word that makes the sentence make sense.`,
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
          `${correct} matches the clue best.`,
          "",
          1300 + index,
        ),
      );
    });

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
          `Follow the pattern to get ${correct}.`,
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
            `${correct} is larger than the other choices.`,
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
        correct = first;
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
          `${correct} is the next symbol in the pattern.`,
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
            `The rule changes an outline shape into a filled shape.`,
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
          `Apply the same rule again. ${next} arrow ${promptRule} becomes ${changedNext}.`,
          "",
          3300 + index,
        ),
      );
    }

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

    return questions;
  }

  function buildMatrixQuestions() {
    const section = SECTIONS[4];
    const questions = [];
    const shapes = ["○", "□", "△", "☆", "◇"];
    const fillPairs = [
      ["○", "●"],
      ["□", "■"],
      ["△", "▲"],
      ["☆", "★"],
      ["◇", "◆"],
    ];
    const sizePairs = [
      ["○", "○ ○"],
      ["□", "□ □"],
      ["△", "△ △"],
      ["☆", "☆ ☆"],
      ["◇", "◇ ◇"],
    ];
    const directionPairs = ["↑", "→", "↓", "←"];

    for (let index = 0; index < 20; index += 1) {
      const top = sizePairs[index % sizePairs.length];
      let bottomIndex = (index + 1 + Math.floor(index / 5)) % sizePairs.length;
      if (bottomIndex === index % sizePairs.length) {
        bottomIndex = (bottomIndex + 1) % sizePairs.length;
      }
      const bottom = sizePairs[bottomIndex];
      const stimulus = formatMatrix(top[0], top[1], bottom[0], "?");

      questions.push(
        makeChoiceQuestion(
          section,
          "Which choice completes the matrix?",
          bottom[1],
          [bottom[0], top[1], top[0]],
          `Across each row, one symbol becomes two matching symbols, so ${bottom[0]} becomes ${bottom[1]}.`,
          stimulus,
          7000 + index,
        ),
      );
    }

    for (let index = 0; index < 20; index += 1) {
      const top = fillPairs[index % fillPairs.length];
      let bottomIndex = (index + 2 + Math.floor(index / 4)) % fillPairs.length;
      if (bottomIndex === index % fillPairs.length) {
        bottomIndex = (bottomIndex + 1) % fillPairs.length;
      }
      const bottom = fillPairs[bottomIndex];
      const stimulus = formatMatrix(top[0], top[1], bottom[0], "?");

      questions.push(
        makeChoiceQuestion(
          section,
          "Which choice completes the matrix?",
          bottom[1],
          [bottom[0], top[0], top[1]],
          `Across each row, the outline shape changes into a filled shape.`,
          stimulus,
          7100 + index,
        ),
      );
    }

    for (let index = 0; index < 20; index += 1) {
      const firstCount = 1 + (index % 3);
      const secondCount = firstCount + 1;
      const topShape = shapes[index % shapes.length];
      const bottomShape = shapes[(index + 1) % shapes.length];
      const topLeft = repeatSymbol(topShape, firstCount);
      const topRight = repeatSymbol(topShape, secondCount);
      const bottomLeft = repeatSymbol(bottomShape, firstCount);
      const correct = repeatSymbol(bottomShape, secondCount);
      const stimulus = formatMatrix(topLeft, topRight, bottomLeft, "?");

      questions.push(
        makeChoiceQuestion(
          section,
          "Which choice completes the matrix?",
          correct,
          [
            repeatSymbol(bottomShape, firstCount),
            repeatSymbol(bottomShape, secondCount + 1),
            repeatSymbol(topShape, secondCount),
          ],
          `Across each row, one more matching symbol is added.`,
          stimulus,
          7200 + index,
        ),
      );
    }

    for (let index = 0; index < 20; index += 1) {
      const topLeft = directionPairs[index % directionPairs.length];
      const topRight = directionPairs[(index + 1) % directionPairs.length];
      const bottomLeft = directionPairs[(index + 2) % directionPairs.length];
      const bottomRight = directionPairs[(index + 3) % directionPairs.length];
      const stimulus = formatMatrix(topLeft, topRight, bottomLeft, "?");

      questions.push(
        makeChoiceQuestion(
          section,
          "Which choice completes the matrix?",
          bottomRight,
          directionPairs.filter((direction) => direction !== bottomRight),
          `Each item turns one step to the right across the row.`,
          stimulus,
          7300 + index,
        ),
      );
    }

    for (let index = 0; index < 20; index += 1) {
      const order = ["○", "□", "△", "☆", "◇"];
      const topLeft = order[index % order.length];
      const topRight = order[(index + 1) % order.length];
      const bottomLeft = order[(index + 2) % order.length];
      const bottomRight = order[(index + 3) % order.length];
      const stimulus = formatMatrix(topLeft, topRight, bottomLeft, "?");

      questions.push(
        makeChoiceQuestion(
          section,
          "Which choice completes the matrix?",
          bottomRight,
          order.filter((shape) => shape !== bottomRight).slice(0, 3),
          `The shapes move forward one step in order, so the next symbol is ${bottomRight}.`,
          stimulus,
          7400 + index,
        ),
      );
    }

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
          `${item} belongs in the ${category} group.`,
          "",
          9100 + index,
        ),
      );
    }

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

    return questions;
  }

  function buildQuestionPool() {
    return {
      [SECTIONS[0]]: buildVerbalQuestions(),
      [SECTIONS[1]]: buildQuantitativeQuestions(),
      [SECTIONS[2]]: buildNonverbalQuestions(),
      [SECTIONS[3]]: buildSpatialQuestions(),
      [SECTIONS[4]]: buildMatrixQuestions(),
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
    const QUESTION_POOL = buildQuestionPool();
    validateQuestionPool(QUESTION_POOL);

    function buildTestSession() {
      const session = [];

      SECTIONS.forEach((section) => {
        const sampledQuestions = sampleWithoutReplacement(QUESTION_POOL[section], QUESTIONS_PER_TEST_SECTION);

        sampledQuestions.forEach((question) => {
          session.push({
            ...question,
            options: [...question.options],
            id: session.length + 1,
          });
        });
      });

      return session;
    }

    window.GiftedQuestionBank = Object.freeze({
      SECTIONS,
      QUESTIONS_PER_SECTION,
      QUESTIONS_PER_TEST_SECTION,
      buildTestSession,
    });
  } catch (error) {
    window.GiftedQuestionBankError = error.message;
  }
})();
