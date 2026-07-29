const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const fixedNow = new Date("2026-07-14T12:00:00.000Z");

class FixedDate extends Date {
  constructor(value) {
    if (arguments.length === 0) {
      super(fixedNow.getTime());
    } else {
      super(value);
    }
  }

  static now() {
    return fixedNow.getTime();
  }
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
      if (!docs[name]) docs[name] = {};
      return {
        doc(id) {
          return {
            async get() {
              const data = docs[name][id];
              return {
                exists: !!data,
                data: () => data || {},
              };
            },
            async set(data, options = {}) {
              docs[name][id] = options.merge
                ? { ...(docs[name][id] || {}), ...data }
                : data;
            },
          };
        },
      };
    },
  };
}

function loadRoute({ user = { uid: "user-1" }, seed = {} } = {}) {
  const adminDb = createDb(seed);
  const aiImprovementCalls = [];
  const route = loadSourceModule(
    "src/app/api/me/cv/route.js",
    ["GET", "POST", "PATCH", "PUT"],
    {
      stripImports: true,
      sandbox: {
        Date: FixedDate,
        NextResponse,
        adminDb,
        buildCvFromProfile: (profile) => ({
          missing_information: ["portfolio link"],
          primary_role: profile.primary_role,
          sections: [
            {
              content_json: { text: "Baseline summary" },
              section_type: "summary",
              title: "Professional Summary",
            },
          ],
          skill_level: profile.skill_level,
          suggested_improvements: ["Add portfolio"],
          summary: "Baseline summary",
          title: `${profile.display_name} CV`,
        }),
        getRequestUser: async () => user,
        improveSummaryWithAI: async (profile, summary) => {
          aiImprovementCalls.push({ profile, summary });
          return "Improved summary";
        },
        serializeFirestoreDate: (value) => value?.toISOString?.() || value,
      },
    }
  );

  return { ...route, adminDb, aiImprovementCalls };
}

test("me/cv route requires authentication", async () => {
  const { GET, POST, PATCH, PUT } = loadRoute({ user: null });

  for (const handler of [GET, POST, PATCH, PUT]) {
    const response = await handler(createRequest({ jsonBody: {} }));
    assert.equal(response.status, 401);
    assert.deepEqual(plain(response.body), { error: "Authentication required" });
  }
});

test("GET /api/me/cv returns the current user's CV or null", async () => {
  let route = loadRoute();
  let response = await route.GET(createRequest());
  assert.deepEqual(plain(response.body), { cv: null });

  route = loadRoute({
    seed: {
      go_cvs: {
        "user-1": {
          created_at: new Date("2026-07-14T10:00:00.000Z"),
          status: "draft",
          title: "Ada CV",
        },
      },
    },
  });
  response = await route.GET(createRequest());

  assert.deepEqual(plain(response.body), {
    cv: {
      created_at: "2026-07-14T10:00:00.000Z",
      status: "draft",
      title: "Ada CV",
    },
  });
});

test("POST /api/me/cv requires onboarding and then generates a CV", async () => {
  let route = loadRoute();
  let response = await route.POST(createRequest());
  assert.equal(response.status, 400);
  assert.deepEqual(plain(response.body), {
    error: "Complete onboarding before generating a CV.",
  });

  route = loadRoute({
    seed: {
      user_profiles: {
        "user-1": {
          consent_ai_generation: true,
          display_name: "Ada",
          primary_role: "Programmer",
          skill_level: "intermediate",
          visibility_job_matching: true,
          visibility_project_creators: true,
          visibility_public: false,
        },
      },
    },
  });
  response = await route.POST(createRequest());

  assert.equal(response.status, 200);
  assert.equal(response.body.cv.title, "Ada CV");
  assert.equal(response.body.cv.summary, "Improved summary");
  assert.equal(route.aiImprovementCalls.length, 1);
  assert.equal(route.adminDb.docs.go_cvs["user-1"].sections[0].content_json.text, "Improved summary");
  assert.equal(route.adminDb.docs.users["user-1"].hasCv, true);
});

test("POST /api/me/cv regenerates without AI when the member has not opted in", async () => {
  const route = loadRoute({
    seed: {
      user_profiles: {
        "user-1": {
          consent_ai_generation: false,
          display_name: "Ada",
          primary_role: "Technical Artist",
          skill_level: "intermediate",
        },
      },
    },
  });

  const response = await route.POST(createRequest());

  assert.equal(response.status, 200);
  assert.equal(response.body.cv.summary, "Baseline summary");
  assert.equal(route.aiImprovementCalls.length, 0);
  assert.equal(
    route.adminDb.docs.go_cvs["user-1"].sections[0].content_json.text,
    "Baseline summary"
  );
});

test("PATCH /api/me/cv only stores allowed editable fields", async () => {
  const route = loadRoute({
    seed: {
      go_cvs: {
        "user-1": {
          status: "draft",
          title: "Old CV",
          user_id: "user-1",
        },
      },
    },
  });

  const response = await route.PATCH(
    createRequest({
      jsonBody: {
        sections: [
          {
            content_json: { text: "Updated summary" },
            section_type: "summary",
            title: "About me",
          },
        ],
        primary_role: "Narrative Designer",
        skill_level: "senior",
        status: "active",
        summary: "Updated summary",
        title: "Updated CV",
        user_id: "someone-else",
        visibility_public: true,
      },
    })
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.cv.title, "Updated CV");
  assert.equal(response.body.cv.summary, "Updated summary");
  assert.deepEqual(plain(response.body.cv.sections), [
    {
      content_json: { text: "Updated summary" },
      section_type: "summary",
      title: "About me",
    },
  ]);
  assert.equal(response.body.cv.primary_role, "Narrative Designer");
  assert.equal(response.body.cv.skill_level, "senior");
  assert.equal(response.body.cv.visibility_public, true);
  assert.equal(response.body.cv.status, "draft");
  assert.equal(response.body.cv.user_id, "user-1");
  assert.equal(
    route.adminDb.docs.user_profiles["user-1"].visibility_public,
    true
  );
  assert.equal(route.adminDb.docs.users["user-1"].profilePrivacy, "public");
});

test("PUT /api/me/cv publishes the current user's CV", async () => {
  const route = loadRoute();

  const response = await route.PUT(createRequest());

  assert.equal(response.status, 200);
  assert.equal(response.body.cv.status, "active");
  assert.equal(response.body.cv.user_id, "user-1");
  assert.equal(response.body.cv.published_at, "2026-07-14T12:00:00.000Z");
});
