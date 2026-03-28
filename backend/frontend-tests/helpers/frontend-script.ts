import path from "node:path";
import { loadFreshGlobalScript, type BrowserGlobal } from "./root-script-loader";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const browserGlobal = globalThis as BrowserGlobal;
const knownGlobals = [
  "secureRandomIndex",
  "GiftedQuestionBank",
  "GiftedQuestionBankError",
  "GiftedScoreboard",
  "GiftedGamification",
  "__GiftedFrameBust",
  "CaptainNovaContent",
] as const;

async function ensureSharedRandomIndex() {
  if (typeof browserGlobal.secureRandomIndex === "function") {
    return;
  }

  const sharedPath = path.resolve(repoRoot, "shared-random.js");
  await loadFreshGlobalScript(sharedPath, browserGlobal, knownGlobals);
}

export async function loadFrontendScript(relativePath: string) {
  if (relativePath !== "shared-random.js") {
    await ensureSharedRandomIndex();
  }

  const scriptPath = path.resolve(repoRoot, relativePath);
  await loadFreshGlobalScript(scriptPath, browserGlobal, knownGlobals);
}

export function resetFrontendGlobals() {
  delete browserGlobal.secureRandomIndex;
  delete browserGlobal.GiftedQuestionBank;
  delete browserGlobal.GiftedQuestionBankError;
  delete browserGlobal.GiftedScoreboard;
  delete browserGlobal.GiftedGamification;
  delete browserGlobal.__GiftedFrameBust;
  delete browserGlobal.CaptainNovaContent;
  globalThis.localStorage.clear();
  document.body.innerHTML = "";
}
