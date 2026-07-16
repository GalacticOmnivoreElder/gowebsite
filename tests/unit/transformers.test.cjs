const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  addValueToObjects,
  formatTimeFromSteps,
  getAvatarShortcut,
} = loadSourceModule("src/utils/transformers.js", [
  "addValueToObjects",
  "formatTimeFromSteps",
  "getAvatarShortcut",
]);

test("addValueToObjects adds lowercase label values", () => {
  assert.deepEqual(
    JSON.parse(JSON.stringify(addValueToObjects([{ label: "Unity" }, { label: "Game Design" }]))),
    [
      { label: "Unity", value: "unity" },
      { label: "Game Design", value: "game design" },
    ]
  );
});

test("getAvatarShortcut derives initials from names", () => {
  assert.equal(getAvatarShortcut(), "AA");
  assert.equal(getAvatarShortcut("ada"), "A");
  assert.equal(getAvatarShortcut("Ada Lovelace"), "AL");
  assert.equal(getAvatarShortcut("Grace Brewster Hopper"), "GBH");
  assert.equal(getAvatarShortcut("Kikerkov "), "K");
  assert.equal(getAvatarShortcut("  Ada   Lovelace  "), "AL");
  assert.equal(getAvatarShortcut("   "), "AA");
  assert.equal(getAvatarShortcut({ username: "Ada" }), "AA");
});

test("formatTimeFromSteps sums step timers into hours and minutes", () => {
  assert.equal(formatTimeFromSteps([]), "");
  assert.equal(formatTimeFromSteps([{ timer: 30 }, { timer: "30" }]), "1min");
  assert.equal(formatTimeFromSteps([{ timer: 3600 }, { timer: 120 }]), "1h 2min");
  assert.equal(formatTimeFromSteps([{ timer: 7200 }]), "2h");
});
