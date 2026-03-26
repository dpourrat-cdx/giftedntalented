import { readFile } from "node:fs/promises";
import vm from "node:vm";

type CanonicalQuestion = {
  bankId: string;
  section: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  stimulus?: string;
};

type QuestionPool = Record<string, CanonicalQuestion[]>;

type QuestionBankApi = {
  SECTIONS: string[];
  QUESTIONS_PER_TEST_SECTION: number;
  getQuestionPool: () => QuestionPool;
};

type LoadedQuestionBank = {
  sections: string[];
  questionsPerTestSection: number;
  questionIndex: Map<string, CanonicalQuestion>;
};

let questionBankPromise: Promise<LoadedQuestionBank> | null = null;

function createQuestionBankContext() {
  const localStorage = {
    getItem() {
      return null;
    },
    setItem() {
      return undefined;
    },
    removeItem() {
      return undefined;
    },
  };

  const windowObject = {
    localStorage,
  } as Record<string, unknown>;

  const context = vm.createContext({
    window: windowObject,
    console,
  });

  return {
    context,
    windowObject,
  };
}

async function loadQuestionBank() {
  const source = await readFile(new URL("../../../question-bank.js", import.meta.url), "utf8");
  const { context, windowObject } = createQuestionBankContext();

  vm.runInContext(source, context, {
    filename: "question-bank.js",
  });

  if (windowObject.GiftedQuestionBankError) {
    throw new Error(`Question bank failed to load: ${String(windowObject.GiftedQuestionBankError)}`);
  }

  const api = windowObject.GiftedQuestionBank as QuestionBankApi | undefined;
  if (!api || typeof api.getQuestionPool !== "function") {
    throw new Error("Question bank API is unavailable to the backend.");
  }

  const pool = api.getQuestionPool();
  const questionIndex = new Map<string, CanonicalQuestion>();

  Object.values(pool).forEach((questions) => {
    questions.forEach((question) => {
      questionIndex.set(question.bankId, {
        ...question,
        options: [...question.options],
      });
    });
  });

  return {
    sections: [...api.SECTIONS],
    questionsPerTestSection: api.QUESTIONS_PER_TEST_SECTION,
    questionIndex,
  };
}

export async function getLoadedQuestionBank() {
  if (!questionBankPromise) {
    questionBankPromise = loadQuestionBank();
  }

  return questionBankPromise;
}
