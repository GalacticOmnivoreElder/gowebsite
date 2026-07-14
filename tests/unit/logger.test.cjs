const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { Logger } = loadSourceModule("src/utils/logger.js", ["Logger"]);

function captureConsole(fn) {
  const calls = { error: [], log: [] };
  const original = { error: console.error, log: console.log };
  console.error = (...args) => calls.error.push(args);
  console.log = (...args) => calls.log.push(args);

  try {
    fn();
    return calls;
  } finally {
    console.error = original.error;
    console.log = original.log;
  }
}

test("Logger writes log and error messages", () => {
  const logger = new Logger({});
  const calls = captureConsole(() => {
    logger.log("hello");
    logger.error("bad", new Error("problem"));
  });

  assert.equal(calls.log[0][0], "hello");
  assert.equal(calls.error[0][0], "bad");
  assert.match(calls.error[0][1].message, /problem/);
});

test("Logger only writes debug messages when debug is enabled", () => {
  const disabledCalls = captureConsole(() => new Logger({ debugEnabled: false }).debug("hidden"));
  const enabledCalls = captureConsole(() => new Logger({ debugEnabled: true }).debug("shown"));

  assert.equal(disabledCalls.log.length, 0);
  assert.equal(enabledCalls.log[0][0], "shown");
});
