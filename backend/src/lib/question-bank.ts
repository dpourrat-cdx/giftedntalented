import questionBankData from "./question-bank.data.json" with { type: "json" };

type CanonicalQuestion = {
  bankId: string;
  section: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  stimulus?: string;
};

type QuestionBankData = {
  sections: string[];
  questionsPerTestSection: number;
  questions: CanonicalQuestion[];
};

type LoadedQuestionBank = {
  sections: string[];
  questionsPerTestSection: number;
  questionIndex: Map<string, CanonicalQuestion>;
};

let questionBankPromise: Promise<LoadedQuestionBank> | null = null;

async function loadQuestionBank() {
  const typedData = questionBankData as QuestionBankData;
  const questionIndex = new Map<string, CanonicalQuestion>();

  typedData.questions.forEach((question) => {
    questionIndex.set(question.bankId, {
      ...question,
      options: [...question.options],
    });
  });

  return {
    sections: [...typedData.sections],
    questionsPerTestSection: typedData.questionsPerTestSection,
    questionIndex,
  };
}

export async function getLoadedQuestionBank() {
  questionBankPromise ??= loadQuestionBank();
  return questionBankPromise;
}
