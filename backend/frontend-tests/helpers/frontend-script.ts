import { readFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");

export async function loadFrontendScript(relativePath: string) {
  const scriptPath = path.resolve(repoRoot, relativePath);
  const scriptContents = await readFile(scriptPath, "utf8");
  const sourcePath = scriptPath.replace(/\\/g, "/");
  window.eval(`${scriptContents}\n//# sourceURL=${sourcePath}`);
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
