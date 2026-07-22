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
  const route = loadSourceModule("src/app/api/onboarding/route.js", ["PUT"], {
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
      getRequestUser: async () => ({ email: "ada@example.com", uid: "user-1" }),
      improveSummaryWithAI: async (_profile, summary) => summary,
      isValidOnboardingStep: () => true,
      serializeFirestoreDate: (value) => value?.toISOString?.() || value,
    },
  });

  return { ...route, adminDb };
}

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
            display_name: "Ada",
            full_name: "Ada Lovelace",
          },
          "role-skills": { primary_role: "Programmer" },
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
});
