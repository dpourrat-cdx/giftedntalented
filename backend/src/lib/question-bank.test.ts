import questionBankData from "./question-bank.data.json" with { type: "json" };

describe("getLoadedQuestionBank", () => {
  it("loads once, caches the promise, and returns cloned question data", async () => {
    vi.resetModules();

    const { getLoadedQuestionBank } = await import("./question-bank.js");
    const firstLoad = await getLoadedQuestionBank();
    const secondLoad = await getLoadedQuestionBank();
    const firstQuestion = questionBankData.questions[0];
    const loadedQuestion = firstLoad.questionIndex.get(firstQuestion.bankId);

    expect(secondLoad).toBe(firstLoad);
    expect(firstLoad.sections).toEqual(questionBankData.sections);
    expect(firstLoad.sections).not.toBe(questionBankData.sections);
    expect(firstLoad.questionsPerTestSection).toBe(questionBankData.questionsPerTestSection);
    expect(firstLoad.questionIndex.size).toBe(questionBankData.questions.length);
    expect(loadedQuestion).toMatchObject({
      bankId: firstQuestion.bankId,
      section: firstQuestion.section,
      prompt: firstQuestion.prompt,
      explanation: firstQuestion.explanation,
    });
    expect(loadedQuestion?.options).toEqual(firstQuestion.options);
    expect(loadedQuestion?.options).not.toBe(firstQuestion.options);
  });
});
