// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import { loadIndexHtml, resetBrowserGlobals } from "./helpers/browser-script";
import { loadFrontendScript } from "./helpers/frontend-script";

const minimalQuestion = {
  id: 1,
  bankId: "Verbal-1",
  section: "Verbal",
  prompt: "Which answer is correct?",
  options: ["Alpha", "Beta", "Gamma", "Delta"],
  answer: 1,
  explanation: "Alpha is correct.",
  stimulus: "",
};

function buildScoreboardStub() {
  const statusCalls: { message: string; tone: string }[] = [];
  return {
    stub: {
      createScoreboardController() {
        return {
          init() {},
          setActivePlayerName() {},
          resetActiveAttempt() {},
          beginAttempt: () => Promise.resolve({ questions: [minimalQuestion] }),
          recordValidatedAnswer: () => Promise.resolve(null),
          finalizeAttempt: () => Promise.resolve(null),
          setStatus(message: string, tone: string) {
            statusCalls.push({ message, tone });
          },
        };
      },
    },
    statusCalls,
  };
}

async function loadApp(grantConsent = false) {
  await loadIndexHtml();
  await loadFrontendScript("content.js");

  window.GiftedQuestionBank = {
    SECTIONS: ["Verbal"],
    QUESTIONS_PER_TEST_SECTION: 1,
    buildTestSession() {
      return [minimalQuestion];
    },
    getQuestionPool() {
      return { Verbal: [minimalQuestion] };
    },
  };
  window.GiftedGamification = {
    createGamificationController() {
      return {
        sync() {},
        onAnswerEvaluated() {},
        onTestCompleted() {},
        hasBlockingOverlay() { return false; },
        showMissionUpdate() {},
        showMissionCompletion() {},
        reset() {},
        clearTransientFeedback() {},
        requestMissionIntroduction() {},
        requestMissionCompletion() {},
      };
    },
  };

  const { stub, statusCalls } = buildScoreboardStub();
  window.GiftedScoreboard = stub;

  if (grantConsent) {
    window.localStorage.setItem("gifted-consent-v1", "1");
  }

  await loadFrontendScript("app.js");

  return { statusCalls };
}

describe("consent notice", () => {
  beforeEach(() => {
    resetBrowserGlobals();
  });

  it("shows the consent notice and disables the name input when no consent is stored", async () => {
    await loadApp(false);

    const notice = document.getElementById("consentNotice");
    const input = document.getElementById("childNameInput") as HTMLInputElement;

    expect(notice?.classList.contains("is-hidden")).toBe(false);
    expect(input?.disabled).toBe(true);
  });

  it("hides the consent notice and leaves input enabled when consent is already in localStorage", async () => {
    await loadApp(true);

    const notice = document.getElementById("consentNotice");
    const input = document.getElementById("childNameInput") as HTMLInputElement;

    expect(notice?.classList.contains("is-hidden")).toBe(true);
    expect(input?.disabled).toBe(false);
  });

  it("hides the notice, enables the input, and saves consent when the checkbox is checked", async () => {
    await loadApp(false);

    const checkbox = document.getElementById("consentCheckbox") as HTMLInputElement;
    const notice = document.getElementById("consentNotice");
    const input = document.getElementById("childNameInput") as HTMLInputElement;

    expect(input?.disabled).toBe(true);

    checkbox.checked = true;
    checkbox.dispatchEvent(new window.Event("change", { bubbles: true }));

    expect(notice?.classList.contains("is-hidden")).toBe(true);
    expect(input?.disabled).toBe(false);
    expect(window.localStorage.getItem("gifted-consent-v1")).toBe("1");
  });

  it("does not hide the notice or enable the input if the checkbox is unchecked", async () => {
    await loadApp(false);

    const checkbox = document.getElementById("consentCheckbox") as HTMLInputElement;
    const input = document.getElementById("childNameInput") as HTMLInputElement;

    checkbox.checked = false;
    checkbox.dispatchEvent(new window.Event("change", { bubbles: true }));

    expect(input?.disabled).toBe(true);
  });
});

describe("explorer name validation", () => {
  beforeEach(() => {
    resetBrowserGlobals();
  });

  async function attemptStart(name: string) {
    const { statusCalls } = await loadApp(true);

    const input = document.getElementById("childNameInput") as HTMLInputElement;
    input.value = name;
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

    await Promise.resolve();

    return { statusCalls };
  }

  it("allows a normal first name to start the mission", async () => {
    const { statusCalls } = await attemptStart("Alex");
    const errors = statusCalls.filter((c) => c.tone === "error");
    expect(errors).toHaveLength(0);
  });

  it("allows a nickname with spaces", async () => {
    const { statusCalls } = await attemptStart("Rocket Girl");
    const errors = statusCalls.filter((c) => c.tone === "error");
    expect(errors).toHaveLength(0);
  });

  it("blocks an email-like name and shows an error", async () => {
    const { statusCalls } = await attemptStart("alex@example.com");
    const errors = statusCalls.filter((c) => c.tone === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/email/i);
  });

  it("blocks another email-like pattern", async () => {
    const { statusCalls } = await attemptStart("child.name@school.edu");
    const errors = statusCalls.filter((c) => c.tone === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/email/i);
  });

  it("blocks a phone-number-like name and shows an error", async () => {
    const { statusCalls } = await attemptStart("555-867-5309");
    const errors = statusCalls.filter((c) => c.tone === "error");
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/phone/i);
  });

  it("blocks a digit-only string that looks like a phone number", async () => {
    const { statusCalls } = await attemptStart("07700900123");
    const errors = statusCalls.filter((c) => c.tone === "error");
    expect(errors.length).toBeGreaterThan(0);
  });
});
