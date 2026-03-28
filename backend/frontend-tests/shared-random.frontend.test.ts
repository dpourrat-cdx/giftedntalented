// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { importBrowserScript, resetBrowserGlobals } from "./helpers/browser-script";

describe("sharedRandomIndex", () => {
  beforeEach(() => {
    resetBrowserGlobals();
    vi.restoreAllMocks();
  });

  it("returns a bounded random index and stops on zero-length input", async () => {
    const values = [4294967295, 1];
    const getRandomValues = vi.fn((target: Uint32Array) => {
      target[0] = values.shift() ?? 0;
      return target;
    });

    vi.stubGlobal("crypto", { getRandomValues });

    await importBrowserScript("shared-random.js");

    expect(window.secureRandomIndex(3)).toBe(1);
    expect(window.secureRandomIndex(0)).toBe(0);
    expect(getRandomValues).toHaveBeenCalledTimes(2);
  });
});
