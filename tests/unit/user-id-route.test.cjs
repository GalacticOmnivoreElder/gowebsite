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

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createDb(seed = {}) {
  const docs = {
    go_cvs: { ...(seed.go_cvs || {}) },
    users: { ...(seed.users || {}) },
  };

  return {
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
          };
        },
      };
    },
  };
}

function loadRoute({ decodedToken = null, seed = {} } = {}) {
  const adminDb = createDb(seed);
  return loadSourceModule("src/app/api/user/[id]/route.js", ["GET", "PUT"], {
    stripImports: true,
    sandbox: {
      NextResponse,
      adminAuth: {
        verifyIdToken: async () => decodedToken,
      },
      adminDb,
      normalizeUsername,
      serializeFirestoreDate: (value) => value?.toISOString?.() || value,
      validateProfileData,
    },
  });
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

test("profile updates persist a generated avatar", async () => {
  const { PUT } = loadRoute({
    decodedToken: { uid: "user-1" },
    seed: { users: { "user-1": { username: "Ada" } } },
  });

  const response = await PUT(
    createRequest({
      headers: { Authorization: "Bearer owner-token" },
      jsonBody: { avatar: "data:image/svg+xml;base64,avatar" },
    }),
    { params: { id: "user-1" } }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.avatar, "data:image/svg+xml;base64,avatar");
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
  assert.equal(body.bio, "Public GO profile summary.");
  assert.deepEqual(body.skills, ["Game Designer", "Programmer", "Unity"]);
  assert.equal(body.joinedAt, "2025-07-10T12:27:56.098Z");
  assert.equal(body.cv.published_at, "2026-07-14T11:00:00.000Z");
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
