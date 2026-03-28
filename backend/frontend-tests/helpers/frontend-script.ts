import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const browserGlobal = globalThis as Window & typeof globalThis & Record<string, unknown>;

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
  delete (window as Window & typeof globalThis & Record<string, unknown>).GiftedQuestionBank;
  delete (window as Window & typeof globalThis & Record<string, unknown>).GiftedQuestionBankError;
  delete (window as Window & typeof globalThis & Record<string, unknown>).GiftedScoreboard;
  delete (window as Window & typeof globalThis & Record<string, unknown>).GiftedGamification;
  delete (window as Window & typeof globalThis & Record<string, unknown>).CaptainNovaContent;
  window.localStorage.clear();
  document.body.innerHTML = "";
}
