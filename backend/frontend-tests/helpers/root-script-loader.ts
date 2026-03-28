import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export type BrowserGlobal = Window & typeof globalThis & Record<string, unknown>;

let importNonce = 0;

async function importScript(scriptPath: string) {
  importNonce += 1;
  const fileUrl = pathToFileURL(scriptPath).href;
  await import(/* @vite-ignore */ `${fileUrl}?gifted-import=${importNonce}`);
}

async function evalScript(scriptPath: string, browserGlobal: BrowserGlobal) {
  const scriptContents = await readFile(scriptPath, "utf8");
  const sourcePath = pathToFileURL(scriptPath).href;
  browserGlobal.eval(`${scriptContents}\n//# sourceURL=${sourcePath}`);
}

function syncBrowserGlobals(browserGlobal: BrowserGlobal, knownGlobals: readonly string[]) {
  for (const key of knownGlobals) {
    if (Object.hasOwn(globalThis, key)) {
      browserGlobal[key] = globalThis[key];
    }
  }
}

export async function loadFreshGlobalScript(
  scriptPath: string,
  browserGlobal: BrowserGlobal,
  knownGlobals: readonly string[],
) {
  await evalScript(scriptPath, browserGlobal);
  await importScript(scriptPath);
  syncBrowserGlobals(browserGlobal, knownGlobals);
}
