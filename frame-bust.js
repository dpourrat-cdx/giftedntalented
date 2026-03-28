(function () {
  function getSafeFrameBustTarget(selfWindow) {
    return new URL("/giftedntalented/", selfWindow.location.origin).toString();
  }

  function bustFrame(frameWindow, selfWindow) {
    if (!frameWindow || !selfWindow || frameWindow.top === selfWindow) {
      return false;
    }

    const targetHref = getSafeFrameBustTarget(selfWindow);

    try {
      frameWindow.top.location.replace(targetHref);
    } catch {
      frameWindow.location.replace(targetHref);
    }

    return true;
  }

  if (globalThis.__GiftedExposeTestUtils) {
    globalThis.__GiftedFrameBust = bustFrame;
  }

  bustFrame(globalThis, globalThis.self ?? globalThis);
})();
