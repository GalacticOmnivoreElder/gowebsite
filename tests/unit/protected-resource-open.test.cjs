const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function loadRoute({ user = null, resource = null, savedTickets = [] } = {}) {
  return loadSourceModule("src/app/resources/[resourceId]/open/route.js", ["POST"], {
    stripImports: true,
    sandbox: {
      Response: NextResponse,
      getRequestUser: async () => user,
      hasResourceAccess: (_id, data, options) => options.admin || data.activeMember === true,
      isPublicResourceStatus: (status) => status === "published" || status === "legacy",
      adminDb: {
        collection(name) {
          return {
            doc(id) {
              if (name === "packages") return { get: async () => ({ exists: !!resource, data: () => resource }) };
              if (name === "protected_link_tickets") return { set: async (value) => savedTickets.push({ id, value }) };
              throw new Error(`Unexpected collection ${name}`);
            },
          };
        },
      },
    },
  });
}

test("protected resource ticket issuance requires authentication and entitlement", async () => {
  let route = loadRoute();
  let response = await route.POST(createRequest({ jsonBody: { assetIndex: 0 } }), { params: Promise.resolve({ resourceId: "pack-1" }) });
  assert.equal(response.status, 401);

  route = loadRoute({
    user: { uid: "user-1", admin: false, userData: {} },
    resource: { status: "published", assets: [{ downloadUrl: "https://files.test/pack.zip" }] },
  });
  response = await route.POST(createRequest({ jsonBody: { assetIndex: 0 } }), { params: Promise.resolve({ resourceId: "pack-1" }) });
  assert.equal(response.status, 403);
});

test("ticket JSON contains only a same-origin open URL and stored metadata contains no destination", async () => {
  const savedTickets = [];
  const route = loadRoute({
    savedTickets,
    user: { uid: "member-1", admin: false, userData: { activeMember: true } },
    resource: { status: "published", assets: [{ downloadUrl: "https://files.test/pack.zip" }] },
  });
  const response = await route.POST(createRequest({ jsonBody: { assetIndex: 0 } }), { params: Promise.resolve({ resourceId: "pack-1" }) });
  assert.equal(response.status, 200);
  assert.match(response.body.openUrl, /^\/resources\/pack-1\/open\?ticket=/);
  assert.doesNotMatch(JSON.stringify(response.body), /files\.test/);
  assert.equal(savedTickets.length, 1);
  assert.doesNotMatch(JSON.stringify(savedTickets[0].value), /files\.test|downloadUrl/);
});
