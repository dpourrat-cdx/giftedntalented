// @vitest-environment jsdom

import { readFile } from "node:fs/promises";
import path from "node:path";
const repoRoot = path.resolve(import.meta.dirname, "..", "..", "..");
const browserGlobal = globalThis as Window & typeof globalThis & Record<string, unknown>;

async function ensureSharedRandomIndex() {
  const scriptPath = path.resolve(repoRoot, "shared-random.js");
  const fsPath = scriptPath.replaceAll("\\", "/");
  if (typeof browserGlobal.secureRandomIndex === "function") {
    return;
  }

  await import(/* @vite-ignore */ `/@fs/${fsPath}`);
}

export async function loadIndexHtml() {
  const htmlPath = path.resolve(repoRoot, "index.html");
  const html = await readFile(htmlPath, "utf8");
  document.open();
  document.write(html);
  document.close();
}

export async function importBrowserScript(relativePath: string) {
  if (relativePath !== "shared-random.js") {
    await ensureSharedRandomIndex();
  }

  const scriptPath = path.resolve(repoRoot, relativePath);
  const fsPath = scriptPath.replaceAll("\\", "/");
  await import(/* @vite-ignore */ `/@fs/${fsPath}`);
}

export function resetBrowserGlobals() {
  delete (window as Window & typeof globalThis & Record<string, unknown>).GiftedQuestionBank;
  delete (window as Window & typeof globalThis & Record<string, unknown>).GiftedGamification;
  delete (window as Window & typeof globalThis & Record<string, unknown>).GiftedScoreboard;
  delete (window as Window & typeof globalThis & Record<string, unknown>).__GiftedExposeTestUtils;
  delete (window as Window & typeof globalThis & Record<string, unknown>).CaptainNovaContent;
  window.localStorage.clear();
  document.body.innerHTML = "";
}
