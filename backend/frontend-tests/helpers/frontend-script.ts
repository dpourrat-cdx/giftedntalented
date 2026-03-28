import { readFile } from "node:fs/promises";
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

function toFsPath(filePath: string) {
  return filePath.replaceAll("\\", "/");
}

async function ensureSharedRandomIndex() {
  if (typeof browserGlobal.secureRandomIndex === "function") {
    return;
  }

  const sharedPath = path.resolve(repoRoot, "shared-random.js");
  const sharedContents = await readFile(sharedPath, "utf8");
  const sourcePath = toFsPath(sharedPath);
  browserGlobal.eval(`${sharedContents}\n//# sourceURL=${sourcePath}`);
}

export async function loadFrontendScript(relativePath: string) {
  if (relativePath !== "shared-random.js") {
    await ensureSharedRandomIndex();
  }

  const scriptPath = path.resolve(repoRoot, relativePath);

  if (relativePath === "question-bank.js") {
    await loadFreshGlobalScript(scriptPath, browserGlobal, knownGlobals);
    return;
  }

  const scriptContents = await readFile(scriptPath, "utf8");
  const sourcePath = toFsPath(scriptPath);
  browserGlobal.eval(`${scriptContents}\n//# sourceURL=${sourcePath}`);
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
