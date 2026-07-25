const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { addTag, getTagSuggestions, normalizeTag, removeTag } = loadSourceModule(
  "src/lib/tag-values.js",
  ["addTag", "getTagSuggestions", "normalizeTag", "removeTag"]
);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("tag values preserve meaningful spaces and normalize only when committed", () => {
  assert.equal(normalizeTag("  Technical   Artist  "), "Technical Artist");
  assert.deepEqual(
    plain(addTag(["Unity"], "Project Management Tools")),
    ["Unity", "Project Management Tools"]
  );
});

test("tag values prevent case-insensitive duplicates and support removal", () => {
  const values = ["Unity", "Technical Artist"];
  assert.deepEqual(plain(addTag(values, " unity ")), values);
  assert.deepEqual(plain(removeTag(values, "technical artist")), ["Unity"]);
});

test("tag suggestions exclude selected values and match a query", () => {
  assert.deepEqual(
    plain(
      getTagSuggestions(
        ["Unity", "Unreal Engine", "Technical Artist"],
        ["Unity"],
        "art"
      )
    ),
    ["Technical Artist"]
  );
});
