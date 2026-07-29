const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const availabilityHelpers = loadSourceModule("src/lib/availability.js", [
  "buildAvailabilityContent",
  "normalizeAvailability",
  "reconcileAvailabilityMissingInformation",
]);
const { buildCvFromProfile } = loadSourceModule(
  "src/lib/cv-generator.js",
  ["buildCvFromProfile"],
  {
    stripImports: true,
    sandbox: availabilityHelpers,
  }
);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("buildCvFromProfile creates a deterministic CV from onboarding facts", () => {
  const cv = buildCvFromProfile({
    can_help_with: ["Unity prototyping"],
    current_goal: "learning to ship a polished vertical slice.",
    discord_username: "go#1234",
    display_name: "Ada",
    email: "ada@example.com",
    location: "Warsaw",
    looking_for_paid_work: true,
    looking_for_projects: true,
    past_projects: [
      {
        description: "A short cooperative puzzle prototype.",
        link: "https://example.com/puzzle",
        role: "Programmer",
        status: "playable",
        title: "Puzzle Jam",
        tools: ["Unity"],
      },
    ],
    preferred_time_commitment: "5 hours/week",
    primary_role: "Programmer",
    secondary_roles: ["Game Designer"],
    skill_level: "intermediate",
    timezone: "Europe/Warsaw",
    tools: ["Unity", "C#", "Git"],
    user_portfolio_links: ["https://ada.dev"],
  });

  assert.equal(cv.title, "Ada \u2014 Programmer");
  assert.match(cv.summary, /Intermediate programmer working with Unity, C#, Git\./);
  assert.match(cv.summary, /Looking for projects, paid work\./);
  assert.equal(cv.sections.length, 8);

  const projectsSection = cv.sections.find((section) => section.section_type === "projects");
  assert.deepEqual(plain(projectsSection.content_json.projects), [
    {
      description: "A short cooperative puzzle prototype.",
      link: "https://example.com/puzzle",
      role: "Programmer",
      status: "playable",
      title: "Puzzle Jam",
      tools: ["Unity"],
    },
  ]);

  assert.deepEqual(plain(cv.suggested_improvements), []);
  assert.deepEqual(plain(cv.missing_information), []);
});

test("buildCvFromProfile records useful gaps for incomplete profiles", () => {
  const cv = buildCvFromProfile({
    display_name: "New Member",
    primary_role: "2D Artist",
  });

  assert.deepEqual(plain(cv.suggested_improvements), [
    "Add at least one portfolio link",
    "Describe one past prototype or game jam project",
    "Define what type of project you want to join",
  ]);
  assert.deepEqual(plain(cv.missing_information), ["portfolio link", "availability"]);
});

test("buildCvFromProfile treats explicit unavailable as complete availability", () => {
  const cv = buildCvFromProfile({
    availability_answered: true,
    availability_status: "unavailable",
    bio: "I might be open to opportunities later.",
    display_name: "Resting Member",
    primary_role: "Producer",
  });
  const availabilitySection = cv.sections.find(
    (section) => section.section_type === "availability"
  );

  assert.equal(
    availabilitySection.content_json.availability_status,
    "unavailable"
  );
  assert.equal(
    availabilitySection.content_json.availability_answered,
    true
  );
  assert.doesNotMatch(cv.summary, /Looking for/u);
  assert.doesNotMatch(
    cv.suggested_improvements.join(" "),
    /type of project you want to join/iu
  );
  assert.deepEqual(plain(cv.missing_information), ["portfolio link"]);
});

test("buildCvFromProfile does not infer availability from profile prose", () => {
  const cv = buildCvFromProfile({
    about_me: "Open to paid work and available for projects.",
    bio: "Looking for a new team.",
    display_name: "New Member",
    primary_role: "2D Artist",
  });

  assert.deepEqual(plain(cv.missing_information), [
    "portfolio link",
    "availability",
  ]);
});
