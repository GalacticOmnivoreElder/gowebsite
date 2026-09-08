const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../../../tests/helpers/load-source-module.cjs");

const profiles = loadSourceModule("src/lib/mentor-profiles.js", [
  "canonicalMentorProfileFields",
  "getMentorCapacity",
  "isMentorProfileComplete",
  "normalizeMentorProfile",
  "toPublicMentorProfileDto",
], { stripImports: true });

const subscriptionState = loadSourceModule("src/lib/subscription-state.js", [
  "normalizeSubscriptionTransition",
], { stripImports: true });

const authUtils = loadSourceModule("src/lib/auth-utils.js", [
  "hasActiveSubscription",
], { stripImports: true });

const pilot = loadSourceModule("src/lib/mentorship-pilot.js", [
  "mentorApplicationNextAction",
  "serializeMentorPilotProfile",
  "serializeMentorApplicationSummary",
  "serializePilotRequest",
  "stableId",
], { stripImports: true, sandbox: { crypto: require("node:crypto") } });

const service = loadSourceModule("src/lib/mentorship-pilot-service.js", [
  "deleteMentorPilotApplication",
  "forwardRequestToRequestedMentor",
  "respondToMentorApplication",
], {
  stripImports: true,
  sandbox: {
    adminDb: { collection: () => ({ doc: () => ({ create: async () => {} }) }) },
    cleanProductNotification: (input) => input,
    enqueueEmailEventForUsers: async () => {},
    getMentorshipPilotConfig: () => ({ applicationResponseTargetWorkingDays: 5 }),
    getMentorCapacity: profiles.getMentorCapacity,
    isMentorProfileComplete: profiles.isMentorProfileComplete,
    normalizeMentorProfile: profiles.normalizeMentorProfile,
    serializeMentorPilotProfile: pilot.serializeMentorPilotProfile,
    stableId: pilot.stableId,
  },
});

const mentorApplicationRoute = loadSourceModule("src/app/api/mentorship/pilot/mentor-application/route.js", ["GET"], {
  stripImports: true,
  sandbox: {
    Response,
    getRequestUser: async () => ({ uid: "mentor-1", userData: { mentorStatus: "approved" } }),
    adminDb: {
      collection(name) {
        return {
          doc(id) {
            const records = {
              mentor_profiles: { "mentor-1": availableMentorProfile({ status: "submitted" }) },
              mentor_applications: { "mentor-1": { status: "submitted" } },
            };
            const data = records[name]?.[id];
            return { get: async () => ({ id, exists: data !== undefined, data: () => data }) };
          },
        };
      },
    },
    serializeMentorApplicationSummary: pilot.serializeMentorApplicationSummary,
    serializeMentorPilotProfile: pilot.serializeMentorPilotProfile,
    routeError: (error, fallback) => Response.json({ error: error?.message || fallback }, { status: 500 }),
  },
});

function createDeletionDb(records = {}, related = {}) {
  const writes = [];
  let generated = 0;
  const snapshot = (id, data) => ({ id, exists: data !== undefined, data: () => data });
  const db = {
    writes,
    collection(name) {
      return {
        doc(id = `generated-${++generated}`) { return { collection: name, id }; },
        where() {
          return {
            limit() {
              return {
                async get() {
                  const docs = (related[name] || []).map((data, index) => snapshot(`${name}-${index}`, data));
                  return { docs, empty: docs.length === 0 };
                },
              };
            },
          };
        },
      };
    },
    async runTransaction(callback) {
      return callback({
        get: async (ref) => snapshot(ref.id, records[ref.collection]?.[ref.id]),
        delete: (ref) => writes.push({ type: "delete", ref }),
        set: (ref, data) => writes.push({ type: "set", ref, data }),
        create: (ref, data) => writes.push({ type: "create", ref, data }),
      });
    },
  };
  return db;
}

function createWorkflowDb(initial = {}) {
  const state = Object.fromEntries(Object.entries(initial).map(([collection, records]) => [collection, { ...records }]));
  const writes = [];
  let generated = 0;
  const snapshot = (ref) => {
    const data = state[ref.collection]?.[ref.id];
    return { id: ref.id, exists: data !== undefined, data: () => data };
  };
  const ref = (collection, id = `generated-${++generated}`) => ({
    collection,
    id,
    async create(data) {
      state[collection] ||= {};
      if (state[collection][id] !== undefined) throw Object.assign(new Error("already exists"), { code: 6 });
      state[collection][id] = data;
      writes.push({ type: "create", collection, id, data });
    },
  });
  const db = {
    state,
    writes,
    collection(name) { return { doc: (id) => ref(name, id) }; },
    async runTransaction(callback) {
      return callback({
        get: async (documentRef) => snapshot(documentRef),
        create(documentRef, data) {
          state[documentRef.collection] ||= {};
          if (state[documentRef.collection][documentRef.id] !== undefined) throw Object.assign(new Error("already exists"), { code: 6 });
          state[documentRef.collection][documentRef.id] = data;
          writes.push({ type: "create", collection: documentRef.collection, id: documentRef.id, data });
        },
        set(documentRef, data, options = {}) {
          state[documentRef.collection] ||= {};
          const previous = state[documentRef.collection][documentRef.id] || {};
          state[documentRef.collection][documentRef.id] = options.merge ? { ...previous, ...data } : data;
          writes.push({ type: "set", collection: documentRef.collection, id: documentRef.id, data });
        },
        update(documentRef, data) {
          state[documentRef.collection] ||= {};
          if (state[documentRef.collection][documentRef.id] === undefined) throw new Error("missing document");
          state[documentRef.collection][documentRef.id] = { ...state[documentRef.collection][documentRef.id], ...data };
          writes.push({ type: "update", collection: documentRef.collection, id: documentRef.id, data });
        },
      });
    },
  };
  return db;
}

function availableMentorProfile(overrides = {}) {
  return {
    displayName: "Mira Mentor",
    professionalHeadline: "Gameplay programmer",
    biography: "Supports creators shipping their first playable milestone.",
    disciplines: ["Programming"],
    skills: ["Unity", "C#"],
    supportedStudentLevels: ["beginner"],
    languages: ["English"],
    mentorshipFormats: ["online"],
    currentlyAcceptingStudents: true,
    availabilitySummary: "accepting",
    maximumActiveStudents: 1,
    activeEngagementCount: 0,
    pilotActiveEngagementCount: 0,
    ...overrides,
  };
}

test("pilot mentor fields normalize into the public profile and shared capacity model", () => {
  const normalized = profiles.normalizeMentorProfile({
    displayName: "Mira Mentor",
    professionalHeadline: "Gameplay programmer",
    biography: "Supports creators shipping their first playable milestone.",
    areasOfExpertise: ["Gameplay"],
    supportedDisciplines: ["Programming"],
    toolsAndTechnologies: ["Unity", "C#"],
    preferredMenteeLevels: ["beginner"],
    availableFormats: ["online"],
    languages: ["English"],
    maximumActiveMentees: 4,
    activeEngagementCount: 1,
    pilotActiveEngagementCount: 2,
    currentlyAcceptingStudents: true,
    availabilitySummary: "limited",
  });
  assert.deepEqual(Array.from(normalized.disciplines), ["Programming"]);
  assert.deepEqual(Array.from(normalized.skills), ["Unity", "C#"]);
  assert.equal(profiles.getMentorCapacity(normalized).availableSlots, 1);
  assert.equal(profiles.toPublicMentorProfileDto("mentor-1", normalized).hasAvailableSlots, true);
  assert.equal(profiles.canonicalMentorProfileFields(normalized).maximumActiveStudents, 4);
});

test("mentor application summaries expose customer guidance without private notes", () => {
  const summary = pilot.serializeMentorApplicationSummary("mentor-1", {
    status: "needs_information",
    customerMessage: "Please add one relevant portfolio link.",
    internalReviewNotes: "Do not expose",
  });
  assert.equal(summary.customerMessage, "Please add one relevant portfolio link.");
  assert.match(summary.nextAction, /requested information/i);
  assert.doesNotMatch(JSON.stringify(summary), /Do not expose/);
});

test("approved mentor application status loads through the authenticated GET route", async () => {
  const response = await mentorApplicationRoute.GET(new Request("https://example.com/api/mentorship/pilot/mentor-application"));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.profile.id, "mentor-1");
  assert.equal(body.application.status, "approved");
  assert.equal(body.profile.status, "approved");
});

test("a canceled subscription retains membership access through its future period end", () => {
  const now = new Date("2026-09-08T12:00:00.000Z");
  const subscriptionEndsAt = new Date("2026-10-08T12:00:00.000Z");
  const transition = subscriptionState.normalizeSubscriptionTransition({
    eventType: "subscription.canceled",
    status: "canceled",
    currentPeriodEnd: subscriptionEndsAt,
    now,
  });
  assert.equal(transition.activeMember, true);
  assert.equal(authUtils.hasActiveSubscription({ ...transition, subscriptionEndsAt }, now), true);
  assert.equal(authUtils.hasActiveSubscription({ ...transition, subscriptionEndsAt }, new Date("2026-10-09T12:00:00.000Z")), false);
});

test("selected mentor requests keep the public snapshot and remove staff notes", () => {
  const request = pilot.serializePilotRequest("request-1", {
    requestedMentorId: "mentor-1",
    requestedMentorProfile: { displayName: "Mira Mentor", availableSlots: 1 },
    internalReviewNotes: "private",
    status: "submitted",
  });
  assert.equal(request.requestedMentorId, "mentor-1");
  assert.equal(request.requestedMentorProfile.availableSlots, 1);
  assert.doesNotMatch(JSON.stringify(request), /private/);
});

test("mentorship UI keeps applications private and deletion guarded", () => {
  const navigation = fs.readFileSync("src/lib/navigation.js", "utf8");
  const publicPage = fs.readFileSync("src/app/matchmaking/page.js", "utf8");
  const dashboard = fs.readFileSync("src/components/mentors/MentorshipPilotDashboard.jsx", "utf8");
  const admin = fs.readFileSync("src/components/admin/MentorshipPilotAdminWorkspace.jsx", "utf8");
  const service = fs.readFileSync("src/lib/mentorship-pilot-service.js", "utf8");
  assert.match(navigation, /href: "\/matchmaking", label: "Mentorship"/);
  assert.match(publicPage, /MentorDirectory/);
  assert.match(dashboard, /MentorshipPilotRequestWorkspace/);
  assert.match(admin, /Reason for deletion/);
  assert.match(service, /DELETABLE_MENTOR_APPLICATION_STATUSES/);
  assert.match(service, /forwarded_to_requested_mentor/);
});

test("admin deletion removes only application-owned records and resets mentor status", async () => {
  const db = createDeletionDb({
    mentor_applications: { "mentor-1": { status: "submitted" } },
    mentor_profiles: { "mentor-1": { status: "submitted" } },
    users: { "mentor-1": { activeMember: true } },
  });
  const result = await service.deleteMentorPilotApplication({ actor: { uid: "admin-1", admin: true }, userId: "mentor-1", reason: "Duplicate submission", db });
  assert.equal(result.deleted, true);
  assert.deepEqual(db.writes.filter((write) => write.type === "delete").map((write) => write.ref.collection).sort(), ["mentor_applications", "mentor_profiles"]);
  const userWrite = db.writes.find((write) => write.type === "set" && write.ref.collection === "users");
  assert.equal(userWrite.data.mentorStatus, "none");
  assert.equal(userWrite.data.mentorPublicProfileEnabled, false);
  const auditWrite = db.writes.find((write) => write.type === "create" && write.ref.collection === "mentorship_audit_events");
  assert.equal(auditWrite.data.metadata.reason, "Duplicate submission");
});

test("mentor deletion rejects unauthorized, approved, and connected records", async () => {
  const submitted = { mentor_applications: { "mentor-1": { status: "submitted" } }, mentor_profiles: { "mentor-1": { status: "submitted" } }, users: { "mentor-1": {} } };
  await assert.rejects(() => service.deleteMentorPilotApplication({ actor: { uid: "member" }, userId: "mentor-1", reason: "No", db: createDeletionDb(submitted) }), (error) => error.status === 403);
  const approved = { mentor_applications: { "mentor-1": { status: "approved" } }, mentor_profiles: { "mentor-1": { status: "approved" } }, users: { "mentor-1": {} } };
  await assert.rejects(() => service.deleteMentorPilotApplication({ actor: { uid: "admin", admin: true }, userId: "mentor-1", reason: "No", db: createDeletionDb(approved) }), (error) => error.status === 409);
  await assert.rejects(() => service.deleteMentorPilotApplication({ actor: { uid: "admin", admin: true }, userId: "mentor-1", reason: "No", db: createDeletionDb(submitted, { mentorship_applications: [{ mentorId: "mentor-1" }] }) }), (error) => error.status === 409);
});

test("selected-mentor forwarding is transactional, idempotent, and rechecks capacity", async () => {
  const db = createWorkflowDb({
    mentorship_pilot_requests: {
      "request-1": {
        status: "submitted",
        requestedMentorId: "mentor-1",
        dataSharingConsent: true,
        consentVersion: "mentorship-pilot-v1",
        menteeUserId: "member-1",
        menteeDisplayName: "Member One",
        title: "Finish prototype",
        goal: "Ship a playable build",
        discipline: "Programming",
        currentLevel: "beginner",
        desiredOutcome: "A stable vertical slice",
      },
    },
    users: { "mentor-1": { mentorStatus: "approved", mentorPublicProfileEnabled: true } },
    mentor_profiles: { "mentor-1": availableMentorProfile() },
    mentor_availability: { "mentor-1": { currentlyAcceptingStudents: true, maximumActiveStudents: 1 } },
  });
  const first = await service.forwardRequestToRequestedMentor({ actor: { uid: "admin-1", admin: true }, requestId: "request-1", db });
  const second = await service.forwardRequestToRequestedMentor({ actor: { uid: "admin-1", admin: true }, requestId: "request-1", db });
  assert.equal(first.status, "pending");
  assert.equal(first.idempotent, false);
  assert.equal(second.id, first.id);
  assert.equal(second.idempotent, true);
  assert.equal(db.state.mentorship_pilot_requests["request-1"].status, "application_submitted");
  assert.equal(db.state.mentorship_applications[first.id].mentorId, "mentor-1");
  assert.equal(db.state.mentorship_suggestions[pilot.stableId("suggestion", "request-1", "mentor-1")].status, "selected");

  const fullDb = createWorkflowDb({
    mentorship_pilot_requests: db.state.mentorship_pilot_requests,
    users: db.state.users,
    mentor_profiles: { "mentor-1": availableMentorProfile({ activeEngagementCount: 1 }) },
    mentor_availability: db.state.mentor_availability,
  });
  fullDb.state.mentorship_pilot_requests["request-1"] = { ...fullDb.state.mentorship_pilot_requests["request-1"], status: "submitted" };
  await assert.rejects(
    () => service.forwardRequestToRequestedMentor({ actor: { uid: "admin-1", admin: true }, requestId: "request-1", db: fullDb }),
    (error) => error.status === 409 && error.code === "mentor_capacity_full"
  );
});

test("mentor acceptance consumes one shared slot and rejects the next acceptance", async () => {
  const application = (requestId) => ({
    requestId,
    suggestionId: `suggestion-${requestId}`,
    mentorId: "mentor-1",
    menteeUserId: `member-${requestId}`,
    status: "pending",
  });
  const db = createWorkflowDb({
    mentor_profiles: { "mentor-1": availableMentorProfile() },
    mentorship_applications: {
      "application-1": application("request-1"),
      "application-2": application("request-2"),
    },
    mentorship_pilot_requests: {
      "request-1": { menteeDisplayName: "Member One", status: "application_submitted" },
      "request-2": { menteeDisplayName: "Member Two", status: "application_submitted" },
    },
  });
  const accepted = await service.respondToMentorApplication({ user: { uid: "mentor-1" }, applicationId: "application-1", action: "accept", db });
  assert.equal(accepted.status, "accepted");
  assert.equal(db.state.mentor_profiles["mentor-1"].pilotActiveEngagementCount, 1);
  await assert.rejects(
    () => service.respondToMentorApplication({ user: { uid: "mentor-1" }, applicationId: "application-2", action: "accept", db }),
    (error) => error.status === 409 && error.code === "mentor_capacity_full"
  );
});

test("profile application loading stays separate and destructive confirmation uses alert semantics", () => {
  const profilePage = fs.readFileSync("src/app/(main)/profile/page.js", "utf8");
  const overview = fs.readFileSync("src/components/profile/MentorApplicationOverview.jsx", "utf8");
  const admin = fs.readFileSync("src/components/admin/MentorshipPilotAdminWorkspace.jsx", "utf8");
  assert.match(profilePage, /<MentorApplicationOverview \/>/);
  assert.match(profilePage, /MobxStore\.applicationsLoading/);
  assert.match(overview, /Mentor application status could not be loaded/);
  assert.match(admin, /role="alertdialog"/);
});
