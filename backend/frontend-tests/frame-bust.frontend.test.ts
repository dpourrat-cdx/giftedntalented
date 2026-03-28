// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { importBrowserScript, loadIndexHtml, resetBrowserGlobals } from "./helpers/browser-script";

describe("frame-bust.js", () => {
  beforeEach(() => {
    resetBrowserGlobals();
    vi.restoreAllMocks();
    (window as Window & typeof globalThis & Record<string, unknown>).__GiftedExposeTestUtils = true;
  });

  afterEach(() => {
    delete (window as Window & typeof globalThis & Record<string, unknown>).__GiftedExposeTestUtils;
    delete (window as Window & typeof globalThis & Record<string, unknown>).__GiftedFrameBust;
    vi.unstubAllGlobals();
  });

  it("loads before the app bundle in index.html and exposes the test helper", async () => {
    await loadIndexHtml();

    const scriptSources = Array.from(document.querySelectorAll("script[src]"), (script) =>
      (script as HTMLScriptElement).getAttribute("src") ?? "",
    );
    const frameBustIndex = scriptSources.findIndex((src) => src.includes("frame-bust.js"));
    const appIndex = scriptSources.findIndex((src) => src.includes("app.js"));

    expect(frameBustIndex).toBeGreaterThan(-1);
    expect(appIndex).toBeGreaterThan(-1);
    expect(frameBustIndex).toBeLessThan(appIndex);

    await importBrowserScript("frame-bust.js");

    expect(typeof window.__GiftedFrameBust).toBe("function");
  });

  it("busts framed windows and falls back when top navigation is blocked", async () => {
    await importBrowserScript("frame-bust.js");

    const bustFrame = window.__GiftedFrameBust as (
      frameWindow: {
        top: { location: { replace: (href: string) => void } };
        location: { replace: (href: string) => void };
      },
      selfWindow: {
        location: { href: string };
      },
    ) => boolean;

    const topReplace = vi.fn();
    const fallbackReplace = vi.fn();
    expect(
      bustFrame(
        {
          top: { location: { replace: topReplace } },
          location: { replace: fallbackReplace },
        },
        {
          location: { href: "https://example.test/mission" },
        },
      ),
    ).toBe(true);
    expect(topReplace).toHaveBeenCalledWith("https://example.test/mission");
    expect(fallbackReplace).not.toHaveBeenCalled();

    const blockedTopReplace = vi.fn(() => {
      throw new Error("blocked");
    });
    const blockedFallbackReplace = vi.fn();
    expect(
      bustFrame(
        {
          top: { location: { replace: blockedTopReplace } },
          location: { replace: blockedFallbackReplace },
        },
        {
          location: { href: "https://example.test/mission-again" },
        },
      ),
    ).toBe(true);
    expect(blockedTopReplace).toHaveBeenCalledWith("https://example.test/mission-again");
    expect(blockedFallbackReplace).toHaveBeenCalledWith("https://example.test/mission-again");
  });
});
