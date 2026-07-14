const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

function loadTokenModule({ hasWindow = false, store = {} } = {}) {
  const localStorage = {
    getItem(key) {
      return store[key] || null;
    },
    removeItem(key) {
      delete store[key];
    },
    setItem(key, value) {
      store[key] = value;
    },
  };

  return loadSourceModule("src/utils/token.js", ["Token"], {
    sandbox: {
      ...(hasWindow ? { localStorage, window: {} } : {}),
    },
  }).Token;
}

test("Token returns null and no-ops outside the browser", () => {
  const Token = loadTokenModule();

  assert.equal(Token.get(), null);
  assert.doesNotThrow(() => Token.set("abc"));
  assert.doesNotThrow(() => Token.clear());
});

test("Token stores and clears the configured auth token in browser storage", () => {
  const originalKey = process.env.authStoreKey;
  process.env.authStoreKey = "custom-auth-token";
  const store = {};

  try {
    const Token = loadTokenModule({ hasWindow: true, store });

    Token.set("abc");
    assert.equal(store["custom-auth-token"], "abc");
    assert.equal(Token.get(), "abc");

    Token.clear();
    assert.equal(Token.get(), null);
  } finally {
    if (originalKey === undefined) {
      delete process.env.authStoreKey;
    } else {
      process.env.authStoreKey = originalKey;
    }
  }
});
