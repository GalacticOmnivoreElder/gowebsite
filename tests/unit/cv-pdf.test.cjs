const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { buildCvPdfDefinition } = loadSourceModule("src/lib/cv-pdf.js", [
  "buildCvPdfDefinition",
]);

test("CV PDF definition is A4, selectable-text based, and contains no private account fields", () => {
  const definition = buildCvPdfDefinition({
    name: "Ada Lovelace",
    headline: "Game Designer",
    summary: "Designs readable cooperative systems.",
    contact: {
      email: "public@example.com",
      location: "Skopje",
    },
    skills: ["Game Design", "Production"],
    tools: ["Unity"],
    experience: [
      {
        title: "Orbit Garden",
        role: "Lead Designer",
        description: "A cooperative prototype.",
      },
    ],
    availability: ["Open to paid work"],
    interests: { lookingFor: ["projects"], canHelpWith: ["prototyping"] },
    portfolioLinks: [],
    socialLinks: [],
  });

  const serialized = JSON.stringify(definition);
  assert.equal(definition.pageSize, "A4");
  assert.deepEqual(
    JSON.parse(JSON.stringify(definition.pageMargins)),
    [40, 48, 40, 36]
  );
  assert.match(serialized, /Ada Lovelace/);
  assert.match(serialized, /Orbit Garden/);
  assert.match(serialized, /public@example\.com/);
  assert.doesNotMatch(serialized, /billing|subscription|application/i);
  assert.equal(serialized.includes("image"), false);
});

test("CV PDF definition accepts long and missing sections without fixed page coordinates", () => {
  const definition = buildCvPdfDefinition({
    name: "Long Profile",
    headline: "Programmer",
    summary: "Long summary ".repeat(800),
    contact: {},
    skills: [],
    tools: [],
    experience: Array.from({ length: 20 }, (_, index) => ({
      title: `Project ${index + 1}`,
      description: "Detailed contribution ".repeat(80),
    })),
    education: [],
    availability: [],
    interests: {},
    portfolioLinks: [],
    socialLinks: [],
  });

  const serialized = JSON.stringify(definition);
  assert.match(serialized, /Project 20/);
  assert.equal(serialized.includes('"absolutePosition"'), false);
  assert.equal(serialized.includes('"pageBreak":"before"'), false);
});
