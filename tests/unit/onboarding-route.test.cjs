const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

const fixedNow = new Date("2026-07-18T12:00:00.000Z");

class FixedDate extends Date {
  constructor(value) {
    super(arguments.length === 0 ? fixedNow.getTime() : value);
  }

  static now() {
    return fixedNow.getTime();
  }
}

function createDb(seed = {}) {
  const docs = {
    go_cvs: { ...(seed.go_cvs || {}) },
    onboarding_sessions: { ...(seed.onboarding_sessions || {}) },
    user_profiles: { ...(seed.user_profiles || {}) },
    users: { ...(seed.users || {}) },
  };

  function ref(collectionName, id) {
    return { collectionName, id };
  }

  return {
    docs,
    batch() {
      const writes = [];
      return {
        set(targetRef, data, options = {}) {
          writes.push({ data, options, targetRef });
        },
        async commit() {
          for (const { data, options, targetRef } of writes) {
            const current = docs[targetRef.collectionName][targetRef.id] || {};
            docs[targetRef.collectionName][targetRef.id] = options.merge
              ? { ...current, ...data }
              : data;
          }
        },
      };
    },
    collection(name) {
      return {
        doc(id) {
          const targetRef = ref(name, id);
          return {
            ...targetRef,
            async get() {
              const data = docs[name][id];
              return {
                exists: !!data,
                data: () => data || {},
              };
            },
          };
        },
      };
    },
  };
}

function loadRoute(seed) {
  const adminDb = createDb(seed);
  const skillSyncCalls = [];
  const emailEvents = [];
  const route = loadSourceModule(
    "src/app/api/onboarding/route.js",
    ["GET", "PUT"],
    {
      stripImports: true,
      sandbox: {
        Date: FixedDate,
        DEFAULT_PROFILE_VISIBILITY: {
          visibility_job_matching: false,
          visibility_project_creators: true,
          visibility_public: false,
        },
        NextResponse,
        ONBOARDING_STEPS: [
          "identity",
          "discord",
          "role-skills",
          "portfolio",
          "goals",
          "help",
          "consent",
        ],
        adminDb,
        cancelPendingEmailEvents: async () => 0,
        enqueueEmailEvent: async (event) => {
          emailEvents.push(event);
          return { created: true, id: "email-job" };
        },
        buildCvFromProfile: (profile) => ({
          missing_information: [],
          sections: [
            {
              content_json: { text: "Updated summary" },
              section_type: "summary",
            },
          ],
          suggested_improvements: [],
          summary: "Updated summary",
          title: `${profile.display_name} CV`,
        }),
        getRequestUser: async () => ({
          email: "ada@example.com",
          uid: "user-1",
        }),
        improveSummaryWithAI: async (_profile, summary) => summary,
        isValidOnboardingStep: () => true,
        sanitizeSkills: (values) => {
          const seen = new Set();
          return (Array.isArray(values) ? values : [])
            .map((value) => (typeof value === "string" ? value.trim() : ""))
            .filter((value) => {
              const key = value.toLowerCase();
              if (!value || value.length > 40 || seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .slice(0, 20);
        },
        serializeFirestoreDate: (value) => value?.toISOString?.() || value,
        syncUserSkillUsage: async (payload) => {
          skillSyncCalls.push(payload);
        },
      },
    }
  );

  return { ...route, adminDb, emailEvents, skillSyncCalls };
}

test("editing onboarding preserves skills already selected in the profile", async () => {
  const route = loadRoute({
    onboarding_sessions: {
      "user-1": {
        current_step: "role-skills",
        draft_data_json: {
          "role-skills": { primary_role: "Programmer" },
        },
        status: "completed",
      },
    },
    user_profiles: {
      "user-1": { onboarding_completed: true },
    },
    users: {
      "user-1": { skills: ["Unity", "Custom Tool"] },
    },
  });

  const response = await route.GET(createRequest());

  assert.equal(response.status, 200);
  assert.deepEqual(
    response.body.session.draft_data_json["role-skills"].skills,
    ["Unity", "Custom Tool"]
  );
});

test("updating onboarding regenerates the CV and preserves its published state", async () => {
  const publishedAt = new Date("2026-07-10T12:00:00.000Z");
  const createdAt = new Date("2026-07-09T12:00:00.000Z");
  const route = loadRoute({
    go_cvs: {
      "user-1": {
        created_at: createdAt,
        published_at: publishedAt,
        status: "active",
      },
    },
    onboarding_sessions: {
      "user-1": {
        draft_data_json: {
          consent: {
            consent_ai_generation: true,
            consent_share_with_admins: true,
            consent_store_data: true,
            visibility_public: true,
          },
          identity: {
            about_me: "I build accessible puzzle games.",
            bio: "Game developer and mentor.",
            display_name: "Ada",
            full_name: "Ada Lovelace",
          },
          "role-skills": {
            primary_role: "Programmer",
            secondary_roles: ["Game Designer", " game designer "],
            skills: ["Unity", " unity ", "Custom Tool"],
            tools: ["Visual Studio Code", "Unity"],
          },
          discord: {
            already_joined: true,
            discord_username: "",
          },
          portfolio: {
            links: [{ type: "portfolio", url: "https://ada.example" }],
            past_projects: [
              {
                title: "Puzzle",
                tools: ["Unity"],
              },
            ],
          },
        },
        status: "completed",
      },
    },
  });

  const response = await route.PUT(createRequest());

  assert.equal(response.status, 200);
  assert.equal(response.body.cv.status, "active");
  assert.equal(response.body.cv.title, "Ada CV");
  assert.equal(response.body.cv.summary, "Updated summary");
  assert.equal(response.body.cv.sections[0].content_json.text, "Updated summary");
  assert.equal(response.body.cv.created_at, createdAt.toISOString());
  assert.equal(response.body.cv.published_at, publishedAt.toISOString());
  assert.equal(route.adminDb.docs.go_cvs["user-1"].status, "active");
  assert.equal(route.adminDb.docs.go_cvs["user-1"].title, "Ada CV");
  assert.equal(
    route.adminDb.docs.go_cvs["user-1"].sections[0].content_json.text,
    "Updated summary"
  );
  assert.equal(route.adminDb.docs.user_profiles["user-1"].display_name, "Ada");
  assert.equal(
    route.adminDb.docs.user_profiles["user-1"].about_me,
    "I build accessible puzzle games."
  );
  assert.equal(route.adminDb.docs.user_profiles["user-1"].discord_joined, true);
  assert.equal(
    route.adminDb.docs.user_profiles["user-1"].portfolio_links[0].url,
    "https://ada.example"
  );
  assert.equal(
    route.adminDb.docs.user_profiles["user-1"].past_projects[0].title,
    "Puzzle"
  );
  assert.deepEqual(
    route.adminDb.docs.user_profiles["user-1"].skills,
    ["Unity", "Custom Tool"]
  );
  assert.deepEqual(route.adminDb.docs.users["user-1"].skills, [
    "Unity",
    "Custom Tool",
  ]);
  assert.equal(route.skillSyncCalls.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(route.skillSyncCalls[0].nextSkills)), [
    "Programmer",
    "Game Designer",
    "Unity",
    "Custom Tool",
    "Visual Studio Code",
  ]);
  assert.equal(route.skillSyncCalls[0].userId, "user-1");
  assert.deepEqual(
    route.emailEvents.filter((event) => event.type === "onboarding.completed"),
    []
  );
});
