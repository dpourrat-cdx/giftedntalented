// @vitest-environment jsdom

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
  "__GiftedExposeTestUtils",
  "CaptainNovaContent",
] as const;

async function ensureSharedRandomIndex() {
  if (typeof browserGlobal.secureRandomIndex === "function") {
    return;
  }

  const scriptPath = path.resolve(repoRoot, "shared-random.js");
  await loadFreshGlobalScript(scriptPath, browserGlobal, knownGlobals);
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
  await loadFreshGlobalScript(scriptPath, browserGlobal, knownGlobals);
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
