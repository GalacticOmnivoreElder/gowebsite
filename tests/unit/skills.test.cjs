const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  aggregateSkillUsage,
  getSkillDocumentId,
  getSkillKey,
  normalizeSkillName,
  sanitizeSkills,
  sortPopularSkills,
} = loadSourceModule(
  "src/lib/skills.js",
  [
    "aggregateSkillUsage",
    "getSkillDocumentId",
    "getSkillKey",
    "normalizeSkillName",
    "sanitizeSkills",
    "sortPopularSkills",
  ]
);

const plain = (value) => JSON.parse(JSON.stringify(value));

test("skill helpers normalize and deduplicate user-created tags", () => {
  assert.equal(normalizeSkillName("  Technical   Art  "), "Technical Art");
  assert.equal(getSkillKey("Technical ART"), "technical art");
  assert.equal(getSkillDocumentId("C#"), "c_23");
  assert.deepEqual(
    plain(
      sanitizeSkills([
        " Unity ",
        "unity",
        "Technical   Art",
        "",
        "x".repeat(41),
      ])
    ),
    ["Unity", "Technical Art"]
  );
});

test("skill usage counts each tag once per profile", () => {
  const usage = aggregateSkillUsage([
    { skills: ["Unity", "unity", "Game Design"] },
    { skills: ["UNITY", "Blender"] },
    { skills: "invalid" },
  ]);

  assert.equal(usage.get("unity").count, 2);
  assert.equal(usage.get("game design").count, 1);
  assert.equal(usage.get("blender").count, 1);
});

test("popular skills sort by use count and then alphabetically", () => {
  const sorted = sortPopularSkills([
    { name: "Unity", usageCount: 8 },
    { name: "Blender", usageCount: 8 },
    { name: "Godot", usageCount: 3 },
  ]);

  assert.deepEqual(
    plain(sorted.map((skill) => skill.name)),
    ["Blender", "Unity", "Godot"]
  );
});
