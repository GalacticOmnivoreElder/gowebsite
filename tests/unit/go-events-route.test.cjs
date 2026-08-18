const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");
const { NextResponse, createRequest } = require("../helpers/route-test-utils.cjs");

function loadRoute(user, access = "members") {
  return loadSourceModule("src/app/api/go-events/[eventId]/join/route.js", ["POST"], {
    stripImports: true,
    sandbox: {
      Response: NextResponse,
      getRequestUser: async () => user,
      getCalendarEventForJoin: async () => ({ event: { id: "event-1" }, source: "members" }),
      getJoinUrlFromCalendarEvent: () => ({ access, joinUrl: "https://meet.google.com/abc-defg-hij" }),
    },
  });
}

test("members-only join route requires authentication and active membership", async () => {
  let route = loadRoute(null);
  let response = await route.POST(createRequest(), { params: Promise.resolve({ eventId: "event-1" }) });
  assert.equal(response.status, 401);

  route = loadRoute({ uid: "free-user", activeMember: false });
  response = await route.POST(createRequest(), { params: Promise.resolve({ eventId: "event-1" }) });
  assert.equal(response.status, 403);
  assert.equal(response.body.code, "GO_EVENTS_MEMBERSHIP_REQUIRED");
});

test("active members receive the Google Meet URL only from the protected route", async () => {
  const route = loadRoute({ uid: "member-1", activeMember: true });
  const response = await route.POST(
    createRequest({ headers: { authorization: "Bearer firebase-token" } }),
    { params: Promise.resolve({ eventId: "event-1" }) }
  );

  assert.equal(response.status, 200);
  assert.equal(response.body.joinUrl, "https://meet.google.com/abc-defg-hij");
  assert.equal(response.headers["Cache-Control"], "private, no-store");
});
