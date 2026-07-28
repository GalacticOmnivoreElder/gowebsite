const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

const { normalizeUsername } = loadSourceModule("src/lib/auth-profile.js", [
  "normalizeUsername",
]);
const { validateProfileData } = loadSourceModule(
  "src/utils/validateProfile.js",
  ["validateProfileData"]
);
const { sanitizeSkills } = loadSourceModule("src/lib/skills.js", [
  "sanitizeSkills",
]);
const { redactCvContact } = loadSourceModule(
  "src/lib/profile-mission.js",
  ["redactCvContact"]
);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDb(seed = {}) {
  const docs = {
    go_cvs: { ...(seed.go_cvs || {}) },
    user_profiles: { ...(seed.user_profiles || {}) },
    users: { ...(seed.users || {}) },
  };

  return {
    docs,
    collection(name) {
      return {
        doc(id) {
          return {
            async get() {
              const exists = Object.prototype.hasOwnProperty.call(docs[name], id);
              return {
                exists,
                data: () => docs[name][id] || {},
              };
            },
            async update(update) {
              docs[name][id] = { ...(docs[name][id] || {}), ...update };
            },
            async set(update, options = {}) {
              docs[name][id] = options.merge
                ? { ...(docs[name][id] || {}), ...update }
                : update;
            },
          };
        },
      };
    },
  };
}

function loadRoute({ decodedToken = null, seed = {} } = {}) {
  const adminDb = createDb(seed);
  const route = loadSourceModule("src/app/api/user/[id]/route.js", ["GET", "PUT"], {
    stripImports: true,
    sandbox: {
      NextResponse,
      adminAuth: {
        verifyIdToken: async () => decodedToken,
      },
      adminDb,
      normalizeUsername,
      serializeFirestoreDate: (value) => value?.toISOString?.() || value,
      sanitizeSkills,
      syncUserSkillUsage: async () => {},
      validateProfileData,
      redactCvContact,
    },
  });
  return { ...route, adminDb };
}

test("profile updates trim usernames before writing them", async () => {
  const { PUT } = loadRoute({
    decodedToken: { uid: "user-1" },
    seed: { users: { "user-1": { username: "OldName" } } },
  });

  const response = await PUT(
    createRequest({
      headers: { Authorization: "Bearer owner-token" },
      jsonBody: { username: "Kikerkov " },
    }),
    { params: { id: "user-1" } }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.username, "Kikerkov");
  assert.ok(response.body.profileEditedAt);
});

test("profile updates accept Discord usernames and work email addresses", async () => {
  const { PUT } = loadRoute({
    decodedToken: { uid: "user-1" },
    seed: { users: { "user-1": { username: "Kikerkov" } } },
  });

  const response = await PUT(
    createRequest({
      headers: { Authorization: "Bearer owner-token" },
      jsonBody: {
        socialLinks: {
          discord: "ikikerkov",
          email: "mugi@mugi.mk",
        },
      },
    }),
    { params: { id: "user-1" } }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body.socialLinks), {
    discord: "ikikerkov",
    email: "mugi@mugi.mk",
  });
});

test("profile updates save short Bio and detailed About Me atomically", async () => {
  const route = loadRoute({
    decodedToken: { uid: "user-1" },
    seed: {
      user_profiles: {
        "user-1": { display_name: "Old Name" },
      },
      users: {
        "user-1": { bio: "Old biography", username: "Old Name" },
      },
    },
  });

  const response = await route.PUT(
    createRequest({
      headers: { Authorization: "Bearer owner-token" },
      jsonBody: {
        aboutMe: "A detailed biography with spaces, punctuation, and commas.",
        bio: "Short creator bio.",
        username: "New Name",
      },
    }),
    { params: { id: "user-1" } }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.bio, "Short creator bio.");
  assert.equal(
    response.body.aboutMe,
    "A detailed biography with spaces, punctuation, and commas."
  );
  assert.equal(
    route.adminDb.docs.user_profiles["user-1"].about_me,
    "A detailed biography with spaces, punctuation, and commas."
  );
  assert.equal(
    route.adminDb.docs.user_profiles["user-1"].display_name,
    "New Name"
  );
});

test("profile updates reject malformed Discord and email values", async () => {
  const { PUT } = loadRoute({
    decodedToken: { uid: "user-1" },
    seed: { users: { "user-1": { username: "Kikerkov" } } },
  });

  const response = await PUT(
    createRequest({
      headers: { Authorization: "Bearer owner-token" },
      jsonBody: {
        socialLinks: {
          discord: "not a discord username",
          email: "not-an-email",
        },
      },
    }),
    { params: { id: "user-1" } }
  );

  assert.equal(response.status, 400);
  assert.equal(
    response.body.validationErrors["socialLinks.discord"],
    "Discord must be a valid username, such as username or username#1234"
  );
});

function cv(overrides = {}) {
  return {
    created_at: new Date("2026-07-14T10:00:00.000Z"),
    published_at: new Date("2026-07-14T11:00:00.000Z"),
    sections: [
      {
        section_type: "skills",
        content_json: {
          primary_role: "Game Designer",
          secondary_roles: ["Programmer"],
        },
      },
      {
        section_type: "tools",
        content_json: { tools: ["Unity", "Game Designer"] },
      },
      {
        section_type: "contact",
        content_json: { display_name: "go" },
      },
    ],
    status: "active",
    summary: "Public GO profile summary.",
    title: "go - Game Designer",
    updated_at: new Date("2026-07-14T12:00:00.000Z"),
    visibility_public: true,
    ...overrides,
  };
}

test("published public GO CV supplies the public profile data", async () => {
  const { GET } = loadRoute({
    seed: {
      users: {
        "user-1": {
          bio: "Legacy bio",
          createdAt: "2025-07-10T12:27:56.098Z",
          profilePrivacy: "private",
          skills: ["Legacy skill"],
          username: "Legacy Name",
        },
      },
      go_cvs: { "user-1": cv() },
    },
  });

  const response = await GET(createRequest(), { params: { id: "user-1" } });
  const body = plain(response.body);

  assert.equal(response.status, 200);
  assert.equal(body.isPrivate, false);
  assert.equal(body.username, "go");
  assert.equal(body.bio, "Legacy bio");
  assert.deepEqual(body.skills, ["Game Designer", "Programmer", "Unity"]);
  assert.equal(body.joinedAt, "2025-07-10T12:27:56.098Z");
  assert.equal(body.memberSince, "2025-07-10T12:27:56.098Z");
  assert.equal(body.cv.published_at, "2026-07-14T11:00:00.000Z");
});

test("public GO CV redacts private email and Discord contact fields", async () => {
  const { GET } = loadRoute({
    seed: {
      users: {
        "user-1": {
          profilePrivacy: "public",
          socialLinks: {
            discord: "private-discord",
            email: "public@example.com",
          },
          socialVisibility: { discord: false, email: true },
          username: "GO Member",
        },
      },
      go_cvs: {
        "user-1": cv({
          sections: [
            {
              section_type: "contact",
              content_json: {
                discord_username: "private-discord",
                display_name: "GO Member",
                email_preference: "public@example.com",
                location: "Skopje",
              },
            },
          ],
        }),
      },
    },
  });

  const response = await GET(createRequest(), { params: { id: "user-1" } });
  const contact = response.body.cv.sections[0].content_json;

  assert.equal(contact.email_preference, "public@example.com");
  assert.equal(contact.discord_username, undefined);
  assert.deepEqual(plain(response.body.socialLinks), {
    email: "public@example.com",
  });
});

test("profile owner retains private GO CV contact fields", async () => {
  const { GET } = loadRoute({
    decodedToken: { uid: "user-1" },
    seed: {
      users: {
        "user-1": {
          profilePrivacy: "private",
          socialVisibility: { discord: false, email: false },
          username: "GO Member",
        },
      },
      go_cvs: {
        "user-1": cv({
          sections: [
            {
              section_type: "contact",
              content_json: {
                discord_username: "private-discord",
                display_name: "GO Member",
                email_preference: "private@example.com",
              },
            },
          ],
          visibility_public: false,
        }),
      },
    },
  });

  const response = await GET(
    createRequest({ headers: { Authorization: "Bearer owner-token" } }),
    { params: { id: "user-1" } }
  );
  const contact = response.body.cv.sections[0].content_json;

  assert.equal(contact.email_preference, "private@example.com");
  assert.equal(contact.discord_username, "private-discord");
});

test("legacy long biographies remain available as About Me", async () => {
  const legacyBiography = "Long biography ".repeat(20).trim();
  const { GET } = loadRoute({
    seed: {
      users: {
        "user-1": {
          bio: legacyBiography,
          createdAt: "2025-07-10T12:27:56.098Z",
          membershipActivatedAt: "2026-01-02T09:30:00.000Z",
          profilePrivacy: "public",
          username: "Legacy Name",
        },
      },
    },
  });

  const response = await GET(createRequest(), { params: { id: "user-1" } });
  assert.equal(response.body.bio, "");
  assert.equal(response.body.aboutMe, legacyBiography);
  assert.equal(response.body.memberSince, "2026-01-02T09:30:00.000Z");
});

test("explicit profile edits override generated CV display fields", async () => {
  const { GET } = loadRoute({
    seed: {
      users: {
        "user-1": {
          bio: "Updated public bio",
          profileEditedAt: new Date("2026-07-15T12:00:00.000Z"),
          skills: ["Godot", "Writing"],
          username: "Galactic Omnivore",
        },
      },
      go_cvs: { "user-1": cv() },
    },
  });

  const response = await GET(createRequest(), { params: { id: "user-1" } });
  const body = plain(response.body);

  assert.equal(response.status, 200);
  assert.equal(body.username, "Galactic Omnivore");
  assert.equal(body.bio, "Updated public bio");
  assert.deepEqual(body.skills, ["Godot", "Writing"]);
});

test("draft or non-public GO CV returns only the private profile shell", async () => {
  const { GET } = loadRoute({
    seed: {
      users: {
        "user-1": { profilePrivacy: "public", username: "Legacy Name" },
      },
      go_cvs: {
        "user-1": cv({ status: "draft", visibility_public: true }),
      },
    },
  });

  const response = await GET(createRequest(), { params: { id: "user-1" } });

  assert.equal(response.status, 200);
  assert.deepEqual(plain(response.body), {
    avatar: null,
    id: "user-1",
    isPrivate: true,
    username: "Legacy Name",
  });
});

test("profile owner can view a private draft GO CV", async () => {
  const { GET } = loadRoute({
    decodedToken: { uid: "user-1" },
    seed: {
      users: {
        "user-1": { profilePrivacy: "private", username: "Legacy Name" },
      },
      go_cvs: {
        "user-1": cv({ status: "draft", visibility_public: false }),
      },
    },
  });

  const response = await GET(
    createRequest({ headers: { Authorization: "Bearer owner-token" } }),
    { params: { id: "user-1" } }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.isPrivate, false);
  assert.equal(response.body.cv.status, "draft");
});

test("legacy profiles without a GO CV keep profilePrivacy behavior", async () => {
  let route = loadRoute({
    seed: {
      users: {
        "user-1": { profilePrivacy: "public", username: "Legacy Name" },
      },
    },
  });
  let response = await route.GET(createRequest(), { params: { id: "user-1" } });
  assert.equal(response.body.isPrivate, false);
  assert.equal(response.body.cv, null);

  route = loadRoute({
    seed: {
      users: {
        "user-1": { profilePrivacy: "private", username: "Legacy Name" },
      },
    },
  });
  response = await route.GET(createRequest(), { params: { id: "user-1" } });
  assert.equal(response.body.isPrivate, true);
});
