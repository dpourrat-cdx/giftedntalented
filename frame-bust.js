(function () {
  function getSafeFrameBustTarget(frameWindow) {
    return new URL("/giftedntalented/", frameWindow.location.origin).toString();
  }

  function bustFrame(frameWindow) {
    if (!frameWindow || frameWindow === frameWindow.top) {
      return false;
    }

    const targetHref = getSafeFrameBustTarget(frameWindow);

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

  bustFrame(globalThis);
})();
