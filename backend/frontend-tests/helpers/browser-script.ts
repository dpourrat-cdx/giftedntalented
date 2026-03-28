import { readFile } from "node:fs/promises";
// @vitest-environment jsdom

import path from "node:path";
import { pathToFileURL } from "node:url";
const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
type BrowserGlobal = Window & typeof globalThis & Record<string, unknown>;

const browserGlobal = globalThis as BrowserGlobal;
let importNonce = 0;

async function importScript(scriptPath: string) {
  importNonce += 1;
  const fileUrl = pathToFileURL(scriptPath).href;
  await import(/* @vite-ignore */ `${fileUrl}?gifted-browser-import=${importNonce}`);
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
    "__GiftedExposeTestUtils",
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

  const scriptPath = path.resolve(repoRoot, "shared-random.js");
  await evalScript(scriptPath);
  await importScript(scriptPath);
}

export async function loadIndexHtml() {
  const htmlPath = path.resolve(repoRoot, "index.html");
  const html = await readFile(htmlPath, "utf8");
  const parsed = new DOMParser().parseFromString(html, "text/html");
  document.head.replaceChildren(...Array.from(parsed.head.childNodes, (node) => document.importNode(node, true)));
  document.body.replaceChildren(...Array.from(parsed.body.childNodes, (node) => document.importNode(node, true)));
}

export async function importBrowserScript(relativePath: string) {
  if (relativePath !== "shared-random.js") {
    await ensureSharedRandomIndex();
  }

  const scriptPath = path.resolve(repoRoot, relativePath);
  await evalScript(scriptPath);
  await importScript(scriptPath);
  syncBrowserGlobals();
}

export function resetBrowserGlobals() {
  delete browserGlobal.secureRandomIndex;
  delete browserGlobal.GiftedQuestionBank;
  delete browserGlobal.GiftedGamification;
  delete browserGlobal.GiftedScoreboard;
  delete browserGlobal.__GiftedFrameBust;
  delete browserGlobal.__GiftedExposeTestUtils;
  delete browserGlobal.CaptainNovaContent;
  globalThis.localStorage.clear();
  document.body.innerHTML = "";
}
