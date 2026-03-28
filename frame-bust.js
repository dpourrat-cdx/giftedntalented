(function () {
  function bustFrame(frameWindow, selfWindow) {
    if (!frameWindow || !selfWindow || frameWindow.top === selfWindow) {
      return false;
    }

    const targetHref = selfWindow.location.href;

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

  bustFrame(window, window.self);
})();
