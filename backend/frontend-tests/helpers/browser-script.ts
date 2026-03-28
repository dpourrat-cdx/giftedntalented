// @vitest-environment jsdom

import { readFile } from "node:fs/promises";
import path from "node:path";
const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
type BrowserGlobal = Window & typeof globalThis & Record<string, unknown>;

const browserGlobal = globalThis as BrowserGlobal;

function toFsPath(filePath: string) {
  return filePath.replaceAll("\\", "/");
}

async function ensureSharedRandomIndex() {
  if (typeof browserGlobal.secureRandomIndex === "function") {
    return;
  }

  const scriptPath = path.resolve(repoRoot, "shared-random.js");
  const fsPath = toFsPath(scriptPath);
  await import(/* @vite-ignore */ `/@fs/${fsPath}`);
}

async function loadEvaluatedScript(relativePath: string) {
  const scriptPath = path.resolve(repoRoot, relativePath);
  const scriptContents = await readFile(scriptPath, "utf8");
  const sourcePath = scriptPath.replaceAll("\\", "/");
  browserGlobal.eval(`${scriptContents}\n//# sourceURL=${sourcePath}`);
}

export async function loadIndexHtml() {
  const htmlPath = path.resolve(repoRoot, "index.html");
  const html = await readFile(htmlPath, "utf8");
  const parsed = new DOMParser().parseFromString(html, "text/html");
  document.head.replaceChildren(...Array.from(parsed.head.childNodes, (node) => document.importNode(node, true)));
  document.body.replaceChildren(...Array.from(parsed.body.childNodes, (node) => document.importNode(node, true)));
}

export async function importBrowserScript(relativePath: string) {
  if (relativePath === "frame-bust.js") {
    await loadEvaluatedScript(relativePath);
    return;
  }

  if (relativePath !== "shared-random.js") {
    await ensureSharedRandomIndex();
  }

  const scriptPath = path.resolve(repoRoot, relativePath);
  const fsPath = toFsPath(scriptPath);
  await import(/* @vite-ignore */ `/@fs/${fsPath}`);
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
