(function () {
  const globalScope = globalThis;

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

  if (globalScope.__GiftedExposeTestUtils) {
    globalScope.__GiftedFrameBust = bustFrame;
  }

  bustFrame(globalScope);
})();
