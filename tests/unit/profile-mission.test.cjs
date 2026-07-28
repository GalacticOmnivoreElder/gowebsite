const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const {
  buildCvExportModel,
  buildMissionProfile,
  redactCvContact,
  sanitizeCvFilename,
} = loadSourceModule("src/lib/profile-mission.js", [
  "buildCvExportModel",
  "buildMissionProfile",
  "redactCvContact",
  "sanitizeCvFilename",
]);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function cv(overrides = {}) {
  return {
    status: "active",
    summary: "Senior game designer focused on collaborative systems.",
    title: "Ada Lovelace - Game Designer",
    sections: [
      {
        section_type: "skills",
        content_json: {
          primary_role: "Game Designer",
          secondary_roles: ["Producer"],
          skill_level: "senior",
        },
      },
      {
        section_type: "tools",
        content_json: { tools: ["Unity", "Figma"] },
      },
      {
        section_type: "projects",
        content_json: {
          projects: [
            {
              title: "Orbit Garden",
              role: "Lead Designer",
              description: "A cooperative systems prototype.",
              tools: ["Unity"],
              link: "https://example.com/orbit",
            },
          ],
        },
      },
      {
        section_type: "contact",
        content_json: {
          display_name: "Ada Lovelace",
          email_preference: "private@example.com",
          discord_username: "private-discord",
          location: "Skopje",
          timezone: "Europe/Skopje",
        },
      },
    ],
    ...overrides,
  };
}

test("mission profile combines legacy and structured GO CV data without inventing fields", () => {
  const model = buildMissionProfile({
    profile: {
      username: "Ada Lovelace",
      bio: "Game systems designer.",
      aboutMe: "Long professional profile.",
      skills: ["Game Design", "Unity"],
      cv: cv(),
      socialLinks: { github: "https://github.com/ada" },
      socialVisibility: { github: true },
    },
    projects: {
      ownerProjects: [{ id: "p1", title: "Community Game", status: "live" }],
    },
    isOwner: true,
  });

  assert.equal(model.name, "Ada Lovelace");
  assert.equal(model.headline, "Game Designer");
  assert.deepEqual(plain(model.skills), [
    "Game Design",
    "Unity",
    "Game Designer",
    "Producer",
  ]);
  assert.equal(model.cvProjects[0].title, "Orbit Garden");
  assert.equal(model.platformProjects[0].role, "Owner");
  assert.equal(model.longBio, "Long professional profile.");
});

test("CV export includes only contact channels made public by the owner", () => {
  const model = buildCvExportModel({
    profile: {
      username: "Ada Lovelace",
      skills: ["Game Design"],
      cv: cv(),
      socialLinks: {
        discord: "private-discord",
        email: "public@example.com",
        github: "https://github.com/ada",
      },
      socialVisibility: {
        discord: false,
        email: true,
        github: true,
      },
    },
  });

  assert.equal(model.contact.email, "public@example.com");
  assert.equal(model.contact.discord, null);
  assert.deepEqual(
    plain(model.socialLinks.map((link) => link.platform)),
    ["github"]
  );
  assert.equal(model.filename, "ada-lovelace-go-cv.pdf");
  assert.equal(model.billing, undefined);
  assert.equal(model.applications, undefined);
});

test("CV export remains usable for incomplete profiles", () => {
  const model = buildCvExportModel({
    profile: { username: "New Pilot", cv: { sections: [], status: "draft" } },
  });

  assert.equal(model.name, "New Pilot");
  assert.equal(model.headline, "Game development professional");
  assert.deepEqual(plain(model.experience), []);
  assert.equal(model.filename, "new-pilot-go-cv.pdf");
});

test("CV contact is exported when its matching visibility control is public", () => {
  const model = buildCvExportModel({
    profile: {
      username: "Visible Contact",
      cv: cv(),
      socialLinks: {},
      socialVisibility: { discord: false, email: true },
    },
  });

  assert.equal(model.contact.email, "private@example.com");
  assert.equal(model.contact.discord, null);
});

test("CV filenames are sanitized and contact redaction preserves non-sensitive fields", () => {
  assert.equal(
    sanitizeCvFilename("  Žan / QA: Lead  "),
    "zan-qa-lead-go-cv.pdf"
  );

  const redacted = redactCvContact(cv(), {
    discord: false,
    email: false,
  });
  const contact = redacted.sections.find(
    (section) => section.section_type === "contact"
  ).content_json;

  assert.equal(contact.email_preference, undefined);
  assert.equal(contact.discord_username, undefined);
  assert.equal(contact.location, "Skopje");
  assert.equal(contact.display_name, "Ada Lovelace");
});
