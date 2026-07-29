const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function createDb(seed = {}) {
  const docs = {
    go_cvs: { ...(seed.go_cvs || {}) },
    projects: { ...(seed.projects || {}) },
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
                id,
                data: () => docs[name][id] || {},
              };
            },
          };
        },
      };
    },
  };
}

function loadRoute({ seed = {}, user = null } = {}) {
  return loadSourceModule("src/app/api/user/[id]/projects/route.js", ["GET"], {
    stripImports: true,
    sandbox: {
      NextResponse,
      PUBLIC_PROJECT_STATUSES: ["hiring", "live", "completed"],
      adminDb: createDb(seed),
      getRequestUser: async () => user,
    },
  });
}

test("public GO profile exposes only its genuinely public projects", async () => {
  const { GET } = loadRoute({
    seed: {
      users: {
        "user-1": {
          ownerOfProjects: ["public-project", "draft-project"],
          profilePrivacy: "private",
        },
      },
      go_cvs: {
        "user-1": { status: "active", visibility_public: true },
      },
      projects: {
        "public-project": {
          archived: false,
          status: "hiring",
          title: "Visible project",
          visibility: "Public",
        },
        "draft-project": {
          archived: false,
          status: "draft",
          title: "Hidden draft",
          visibility: "Public",
        },
      },
    },
  });

  const response = await GET(createRequest(), { params: { id: "user-1" } });

  assert.equal(response.status, 200);
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(response.body.ownerProjects.map((project) => project.id))
    ),
    ["public-project"]
  );
  assert.equal(response.body.totalProjects, 1);
});

test("owner and admin tokens cannot reveal drafts on a public profile", async () => {
  const seed = {
    users: {
      "user-1": {
        ownerOfProjects: ["public-project", "draft-project"],
        profilePrivacy: "public",
      },
    },
    projects: {
      "public-project": {
        archived: false,
        status: "live",
        title: "Visible project",
        visibility: "Public",
      },
      "draft-project": {
        archived: false,
        status: "draft",
        title: "Hidden draft",
        visibility: "Private",
      },
    },
  };

  for (const user of [
    { uid: "user-1" },
    { admin: true, uid: "admin-1" },
  ]) {
    const { GET } = loadRoute({ seed, user });
    const response = await GET(createRequest(), { params: { id: "user-1" } });

    assert.deepEqual(
      JSON.parse(
        JSON.stringify(response.body.ownerProjects.map((project) => project.id))
      ),
      ["public-project"]
    );
    assert.equal(response.body.totalProjects, 1);
  }
});

test("management scope returns an owner's draft and rejected projects", async () => {
  const seed = {
    users: {
      "user-1": {
        ownerOfProjects: ["draft-project", "rejected-project"],
        profilePrivacy: "private",
      },
    },
    projects: {
      "draft-project": {
        archived: false,
        status: "draft",
        title: "Draft project",
        visibility: "Private",
      },
      "rejected-project": {
        archived: false,
        status: "rejected",
        title: "Rejected project",
        visibility: "Public",
      },
    },
  };
  const { GET } = loadRoute({
    seed,
    user: { uid: "user-1" },
  });

  const response = await GET(
    createRequest({
      url: "https://go.test/api/user/user-1/projects?scope=management",
    }),
    { params: { id: "user-1" } }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.scope, "management");
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        response.body.ownerProjects.map((project) => project.id)
      )
    ),
    ["draft-project", "rejected-project"]
  );
});

test("management scope rejects unrelated viewers", async () => {
  const { GET } = loadRoute({
    seed: {
      users: {
        "user-1": {
          ownerOfProjects: ["draft-project"],
          profilePrivacy: "public",
        },
      },
      projects: {
        "draft-project": {
          status: "draft",
          title: "Draft project",
          visibility: "Private",
        },
      },
    },
    user: { uid: "stranger" },
  });

  const response = await GET(
    createRequest({
      url: "https://go.test/api/user/user-1/projects?scope=management",
    }),
    { params: { id: "user-1" } }
  );

  assert.equal(response.status, 403);
});

test("draft GO profile keeps project history private", async () => {
  const { GET } = loadRoute({
    seed: {
      users: {
        "user-1": { profilePrivacy: "public" },
      },
      go_cvs: {
        "user-1": { status: "draft", visibility_public: true },
      },
    },
  });

  const response = await GET(createRequest(), { params: { id: "user-1" } });

  assert.equal(response.status, 403);
  assert.deepEqual(JSON.parse(JSON.stringify(response.body)), {
    error: "This user's profile is private",
  });
});
