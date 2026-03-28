import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
type BrowserGlobal = Window & typeof globalThis & Record<string, unknown>;

const browserGlobal = globalThis as BrowserGlobal;

async function ensureSharedRandomIndex() {
  if (typeof browserGlobal.secureRandomIndex === "function") {
    return;
  }

  const sharedPath = path.resolve(repoRoot, "shared-random.js");
  const sharedContents = await readFile(sharedPath, "utf8");
  const sourcePath = sharedPath.replaceAll("\\", "/");
  browserGlobal.eval(`${sharedContents}\n//# sourceURL=${sourcePath}`);
}

export async function loadFrontendScript(relativePath: string) {
  if (relativePath !== "shared-random.js") {
    await ensureSharedRandomIndex();
  }

  const scriptPath = path.resolve(repoRoot, relativePath);
  const scriptContents = await readFile(scriptPath, "utf8");
  const sourcePath = scriptPath.replaceAll("\\", "/");
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
  window.localStorage.clear();
  document.body.innerHTML = "";
}
