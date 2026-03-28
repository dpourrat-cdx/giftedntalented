(function () {
  const globalScope = globalThis;

  function secureRandomIndex(length) {
    if (length <= 0) {
      return 0;
    }

    const cryptoApi = globalScope.crypto;
    if (!cryptoApi || typeof cryptoApi.getRandomValues !== "function") {
      throw new Error("Secure randomness is unavailable in this browser.");
    }

    const limit = Math.floor(0x100000000 / length) * length;
    const values = new Uint32Array(1);
    do {
      cryptoApi.getRandomValues(values);
    } while (values[0] >= limit);

    return values[0] % length;
  }

  globalScope.secureRandomIndex = globalScope.secureRandomIndex || secureRandomIndex;
})();
