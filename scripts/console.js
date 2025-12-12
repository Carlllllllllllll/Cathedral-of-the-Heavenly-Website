(function () {
  const originalClear = localStorage.clear.bind(localStorage);
  const originalRemoveItem = localStorage.removeItem.bind(localStorage);
  const originalSetItem = localStorage.setItem.bind(localStorage);
  const originalGetItem = localStorage.getItem.bind(localStorage);

  Object.defineProperty(window, "localStorage", {
    configurable: false,
    value: {
      clear() {
        throw new Error("Blocked: Attempt to clear localStorage!");
      },
      removeItem(key) {
        if (key === "scriptName") {
          throw new Error("Blocked: Attempt to remove protected script!");
        }
        return originalRemoveItem(key);
      },
      setItem(key, value) {
        return originalSetItem(key, value);
      },
      getItem(key) {
        return originalGetItem(key);
      },
    },
  });

  const originalEval = window.eval;
  window.eval = function () {
    throw new Error("Blocked: eval is disabled for security reasons!");
  };

  const originalConsoleMethods = {
    log: console.log.bind(console),
    error: console.error.bind(console),
    warn: console.warn.bind(console),
  };

  Object.keys(console).forEach((method) => {
    console[method] = (...args) => {
      if (
        args.some(
          (arg) => typeof arg === "string" && arg.includes("localStorage")
        )
      ) {
        throw new Error("Blocked: Unauthorized console operation!");
      }
      originalConsoleMethods[method](...args);
    };
  });

  const warning = `
    %cSTOP!
    %cThis feature is for developers only.
    %cPasting anything here may compromise your security.
  `;

  const styles = [
    "color: red; font-size: 48px; font-weight: bold;",
    "color: black; font-size: 16px;",
    "color: black; font-size: 16px;",
  ];

  setInterval(() => {
    console.log(warning, ...styles);
  }, 3000);
})();
