import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
type BrowserGlobal = Window & typeof globalThis & Record<string, unknown>;

const browserGlobal = globalThis as BrowserGlobal;
let importNonce = 0;

async function importScript(scriptPath: string) {
  importNonce += 1;
  const fileUrl = pathToFileURL(scriptPath).href;
  await import(/* @vite-ignore */ `${fileUrl}?gifted-test-import=${importNonce}`);
}

async function evalScript(scriptPath: string) {
  const scriptContents = await readFile(scriptPath, "utf8");
  const sourcePath = pathToFileURL(scriptPath).href;
  browserGlobal.eval(`${scriptContents}\n//# sourceURL=${sourcePath}`);
}

function syncBrowserGlobals() {
  const knownGlobals = [
    "secureRandomIndex",
    "GiftedQuestionBank",
    "GiftedQuestionBankError",
    "GiftedScoreboard",
    "GiftedGamification",
    "__GiftedFrameBust",
    "CaptainNovaContent",
  ] as const;

  for (const key of knownGlobals) {
    if (Object.prototype.hasOwnProperty.call(globalThis, key)) {
      browserGlobal[key] = globalThis[key];
    }
  }
}

async function ensureSharedRandomIndex() {
  if (typeof browserGlobal.secureRandomIndex === "function") {
    return;
  }

  const sharedPath = path.resolve(repoRoot, "shared-random.js");
  await evalScript(sharedPath);
  await importScript(sharedPath);
}

export async function loadFrontendScript(relativePath: string) {
  if (relativePath !== "shared-random.js") {
    await ensureSharedRandomIndex();
  }

  const scriptPath = path.resolve(repoRoot, relativePath);
  await evalScript(scriptPath);
  await importScript(scriptPath);
  syncBrowserGlobals();
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
