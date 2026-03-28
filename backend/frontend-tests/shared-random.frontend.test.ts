// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadFrontendScript, resetFrontendGlobals } from "./helpers/frontend-script";

describe("shared-random.js", () => {
  beforeEach(() => {
    resetFrontendGlobals();
    vi.restoreAllMocks();
  });

  it("exposes secureRandomIndex and uses crypto-backed randomness", async () => {
    const getRandomValues = vi
      .spyOn(globalThis.crypto, "getRandomValues")
      .mockImplementation((values) => {
        values[0] = 7;
        return values;
      });

    await loadFrontendScript("shared-random.js");

    expect(typeof window.secureRandomIndex).toBe("function");
    expect(window.secureRandomIndex(5)).toBe(2);
    expect(getRandomValues).toHaveBeenCalled();
  });

  it("returns 0 when asked for a non-positive range", async () => {
    await loadFrontendScript("shared-random.js");

    expect(window.secureRandomIndex(0)).toBe(0);
  });
});
