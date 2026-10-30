const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { test } = require("node:test");
const { loadSourceModule } = require("./tests/helpers/load-source-module.cjs");

const skills = loadSourceModule("src/lib/skills.js", ["getSkillKey", "sanitizeSkills"]);
const journey = loadSourceModule("src/lib/go-journey.mjs", ["formatGoStardate", "normalizeMatchmakingProfile", "publicJourneyEvent", "scoreMatch", "summarizeJourney"], { stripImports: true, sandbox: skills });
const passport = loadSourceModule("src/lib/monday-builds.mjs", ["displayedPassportStamps", "passportIsVisible"]);
const plain = (value) => JSON.parse(JSON.stringify(value));

test("GO stardate keeps canonical UTC and scientific uncertainty", () => {
  const date = journey.formatGoStardate("2018-01-01T00:00:00.000Z");
  assert.equal(date.version, "go-cosmic-v1");
  assert.equal(date.label, "GO-SD 13.80 ± 0.03 Gyr · 2018.001");
  assert.equal(date.utc, "2018-01-01T00:00:00.000Z");
  assert.match(date.source, /doi\.org/);
  assert.match(date.uncertainty, /13\.797 ± 0\.023/);
  assert.equal(journey.formatGoStardate("not a date"), null);
});

test("matchmaking excludes hunger unless the member opts in", () => {
  const hidden = journey.normalizeMatchmakingProfile({ optedIn: true, shareAppetite: false, sharedAppetite: "hungry", skills: ["Unity", "unity"] });
  assert.equal(hidden.sharedAppetite, null);
  assert.deepEqual(plain(hidden.skills), ["Unity"]);
  assert.equal(journey.scoreMatch(hidden, { optedIn: true }).reasons.some((reason) => /hunger/i.test(reason)), false);
  const shared = journey.normalizeMatchmakingProfile({ optedIn: true, shareAppetite: true, sharedAppetite: "hungry" });
  assert.equal(shared.sharedAppetite, "hungry");
  assert.equal(journey.scoreMatch({ ...shared, availability: "unavailable" }, { optedIn: true }).eligible, false);
  assert.equal(journey.scoreMatch({ optedIn: false }, { optedIn: true }).eligible, false);
});

test("public journal projection excludes private and corrected entries", () => {
  const event = { id: "event-1", type: "game_jam_attended", title: "Private", summary: "Private details", publicTitle: "Attended a GO game jam", publicSummary: "Attendance was verified.", occurredAt: "2026-10-17T10:00:00.000Z", visibility: "public", status: "active" };
  const result = journey.publicJourneyEvent(event);
  assert.equal(result.title, "Attended a GO game jam");
  assert.equal(result.summary, "Attendance was verified.");
  assert.equal("privateSummary" in result, false);
  assert.equal(journey.publicJourneyEvent({ ...event, visibility: "private" }), null);
  assert.equal(journey.publicJourneyEvent({ ...event, status: "corrected" }), null);
  assert.deepEqual(plain(journey.summarizeJourney([{ type: "game_jam_attended", status: "active" }, { type: "game_jam_attended", status: "corrected" }, { type: "match_accepted", status: "active" }, { type: "skill_validated", status: "active" }])), { gameJamsAttended: 1, collaborationsAccepted: 1, skillsValidated: 1 });
});

test("new journey events default private and owners can change visibility without changing legacy choices", async () => {
  const id = "a".repeat(64);
  const docs = new Map([[`go_journey_events/${id}`, { userId: "owner", type: "game_jam_attended", visibility: "private", status: "active" }], ["go_journey_preferences/owner", { hiddenEventIds: [] }]]);
  const writes = [];
  const db = { collection: (name) => ({ doc: (key) => ({ id: key, path: `${name}/${key}` }) }), runTransaction: async (fn) => fn({
    get: async (ref) => ({ exists: docs.has(ref.path), data: () => docs.get(ref.path) }),
    set: (ref, value, options) => { docs.set(ref.path, { ...(options?.merge ? docs.get(ref.path) : {}), ...value }); writes.push([ref.path, value]); },
    update: (ref, value) => { docs.set(ref.path, { ...docs.get(ref.path), ...value }); writes.push([ref.path, value]); },
  }) };
  const service = loadSourceModule("src/lib/go-journey-service.js", ["appendJourneyEvent", "updateJourneyVisibility", "safeJourneyEntry"], { stripImports: true, sandbox: { createHash, FieldValue: { increment: (value) => value }, adminDb: db, publicJourneyEvent: journey.publicJourneyEvent } });
  const written = [];
  service.appendJourneyEvent({ set: (ref, value) => written.push([ref.path, value]) }, { uid: "owner", type: "other", sourceId: "1", title: "New event" });
  assert.equal(written[0][1].visibility, "private");
  const doc = { id, data: () => ({ ...docs.get(`go_journey_events/${id}`), occurredAt: new Date(), title: "Event" }) };
  assert.equal(service.safeJourneyEntry(doc, [], true).visibility, "private");
  assert.equal(service.safeJourneyEntry(doc, [], false), null);
  await service.updateJourneyVisibility("owner", { eventId: id, isPublic: true });
  assert.equal(docs.get(`go_journey_events/${id}`).visibility, "public");
  assert.equal(writes.at(-1)[1].public_gameJamsAttended, 1);
  await service.updateJourneyVisibility("owner", { eventId: id, isPublic: false });
  assert.equal(writes.at(-1)[1].public_gameJamsAttended, -1);
  await assert.rejects(service.updateJourneyVisibility("other", { eventId: id, isPublic: true }), { status: 404 });
});

test("re-recording registration preserves an existing public or private choice", async () => {
  let previous = null;
  let saved;
  const db = { collection: () => ({ doc: (id) => ({ id }) }), runTransaction: async (fn) => fn({
    get: async () => ({ exists: !!previous, data: () => previous }),
    set: (_ref, value) => { saved = value; },
  }) };
  const service = loadSourceModule("src/lib/go-journey-service.js", ["recordJourneyEvent"], { stripImports: true, sandbox: { createHash, adminDb: db } });
  const input = { uid: "owner", type: "game_jam_registered", sourceId: "jam", title: "Registered" };
  await service.recordJourneyEvent(input);
  assert.equal(saved.visibility, "private");
  previous = { visibility: "public" };
  await service.recordJourneyEvent(input);
  assert.equal(saved.visibility, "public");
  previous = { visibility: "private" };
  await service.recordJourneyEvent({ ...input, visibility: "public" });
  assert.equal(saved.visibility, "private");
});

test("Passport display controls hide public stamps and retain owner history", () => {
  const stamps = [{ id: "stamp-a" }, { id: "stamp-b" }];
  assert.deepEqual(plain(passport.displayedPassportStamps(stamps, ["stamp-a"])), [{ id: "stamp-b" }]);
  assert.deepEqual(plain(passport.displayedPassportStamps(stamps, ["stamp-a"], { owner: true })), [{ id: "stamp-a", displayed: false }, { id: "stamp-b", displayed: true }]);
  assert.equal(passport.passportIsVisible({ hasCv: false, profilePrivacy: "private" }), false);
  assert.equal(passport.passportIsVisible({ hasCv: true, publicCv: false, profilePrivacy: "public" }), false);
});

test("Passport visibility changes only an issued stamp owned by the requester", async () => {
  const stampId = "b".repeat(64);
  const documents = new Map([["passport_stamps/" + stampId, { userId: "owner", status: "issued" }]]);
  const ref = (collection, id) => ({ id, path: collection + "/" + id });
  const db = {
    collection: (name) => ({ doc: (id) => ref(name, id) }),
    runTransaction: async (callback) => callback({
      get: async (reference) => { const value = documents.get(reference.path); return { exists: value !== undefined, data: () => value }; },
      set: (reference, value) => documents.set(reference.path, { ...documents.get(reference.path), ...value }),
    }),
  };
  const service = loadSourceModule("src/lib/go-journey-service.js", ["setPassportDisplay"], { stripImports: true, sandbox: { createHash, FieldValue: { increment: (value) => ({ increment: value }) }, adminDb: db } });
  assert.deepEqual(plain(await service.setPassportDisplay("owner", stampId, false)).hiddenStampIds, [stampId]);
  assert.deepEqual(plain(await service.setPassportDisplay("owner", stampId, true)).hiddenStampIds, []);
  await assert.rejects(service.setPassportDisplay("other", stampId, false), { status: 403 });
});

test("GO game jam markers are workshop-only and public in event summaries", () => {
  const learning = loadSourceModule("src/lib/learning-items.js", ["cleanLearningItem", "toPublicLearningItemDto"], {
    stripImports: true,
    sandbox: { isPublicLearningStatus: () => true, hasMentorToolAccess: () => false, cleanCourseModules: (v) => v || [], cleanCourseResources: (v) => v || [], cleanCourseSessions: (v) => v || [], courseSeatCount: () => 0, courseUrl: (v) => v || null },
  });
  const workshop = learning.cleanLearningItem({ learningType: "workshop", isGameJam: true, skillTags: ["Unity", "Unity"], slug: "jam", title: "GO Jam", description: "Build together", status: "enrollment_open" });
  const dto = learning.toPublicLearningItemDto({ id: "jam-1", ...workshop });
  assert.equal(dto.isGameJam, true);
  assert.deepEqual(plain(dto.skillTags), ["Unity"]);
  assert.equal(learning.cleanLearningItem({ learningType: "course", isGameJam: true, slug: "course", title: "Course", description: "Course" }).isGameJam, false);
});

test("match action requires both participants opted in and mutual acceptance", async () => {
  const docs = new Map([["go_matchmaking_profiles/alex", { optedIn: true }], ["go_matchmaking_profiles/beck", { optedIn: true }], ["go_matchmaking_profiles/closed", { optedIn: false }], ["users/alex", { activeMember: true }], ["users/beck", { activeMember: true }], ["users/closed", { activeMember: true }]]);
  const events = [];
  const ref = (collection, id) => ({ id, path: collection + "/" + id });
  const db = { collection: (name) => ({ doc: (id) => ref(name, id) }), runTransaction: async (fn) => fn({
    get: async (r) => { const value = docs.get(r.path); return { exists: value !== undefined, id: r.id, data: () => value }; },
    set: (r, value, options = {}) => docs.set(r.path, { ...(options.merge ? docs.get(r.path) : {}), ...value }),
  }) };
  const service = loadSourceModule("src/lib/go-journey-service.js", ["actOnMatch"], { stripImports: true, sandbox: { createHash, FieldValue: { increment: (v) => ({ increment: v }) }, adminDb: db, hasCommunityContentAccess: (user) => user.activeMember === true, normalizeAvailability: () => ({ status: "available" }), appendJourneyEvent: (_transaction, event) => events.push(event) } });
  await assert.rejects(service.actOnMatch("alex", { peerId: "closed", action: "accept" }), { status: 409 });
  assert.equal((await service.actOnMatch("alex", { peerId: "beck", action: "accept" })).state, "pending");
  assert.equal(events.length, 0);
  assert.equal((await service.actOnMatch("beck", { peerId: "alex", action: "accept" })).state, "matched");
  assert.equal([...docs.keys()].filter((key) => key.startsWith("go_journey_events/")).length, 2);
});

test("private profiles cannot be read through the public development log route", async () => {
  let read = false;
  const route = loadSourceModule("src/app/api/development-log/route.js", ["GET"], { stripImports: true, sandbox: {
    URL, Response, getRequestUser: async () => null, getProductConfig: () => ({ featureFlags: { goDevelopmentJourney: true } }),
    adminDb: { collection: (name) => ({ doc: () => ({ get: async () => ({ exists: name === "users", data: () => ({ profilePrivacy: "private" }) }) }) }) },
    passportIsVisible: ({ hasCv, profilePrivacy }) => hasCv || profilePrivacy === "public",
    readJourney: async () => { read = true; return { entries: [] }; },
  } });
  const response = await route.GET(new Request("https://go.test/api/development-log?userId=private-user"));
  assert.equal(response.status, 404);
  assert.equal(read, false);
});

test("skill evidence rejects self-review and unrelated reviewers", async () => {
  const evidenceId = "a".repeat(64);
  const docs = new Map([["go_skill_evidence/" + evidenceId, { userId: "creator", skill: "Unity", sourceType: "project", sourceId: "project-1", status: "pending" }], ["projects/project-1", { members: ["creator", "collaborator"] }], ["users/creator", { skills: ["Unity"] }]]);
  const ref = (collection, id) => ({ id, path: collection + "/" + id });
  const db = { collection: (name) => ({ doc: (id) => ref(name, id) }), runTransaction: async (fn) => fn({
    get: async (r) => { const value = docs.get(r.path); return { exists: value !== undefined, data: () => value }; },
    update: (r, value) => docs.set(r.path, { ...docs.get(r.path), ...value }),
    set: () => {},
  }) };
  const events = [];
  const service = loadSourceModule("src/lib/go-skill-evidence-service.js", ["validateSkillEvidence"], { stripImports: true, sandbox: { createHash, adminDb: db, getSkillKey: skills.getSkillKey, sanitizeSkills: skills.sanitizeSkills, isProjectMember: (project, user) => project.members.includes(user.uid), appendJourneyEvent: (_transaction, event) => events.push(event), passportIsVisible: () => true } });
  await assert.rejects(service.validateSkillEvidence({ uid: "stranger" }, evidenceId), { status: 403 });
  await assert.rejects(service.validateSkillEvidence({ uid: "creator" }, evidenceId), { status: 403 });
  const validated = await service.validateSkillEvidence({ uid: "collaborator" }, evidenceId);
  assert.equal(validated.status, "validated");
  assert.equal(docs.get("go_skill_evidence/" + evidenceId).validatedBy, "collaborator");
  assert.equal(events.length, 1);
});

test("organizer-verified jam attendance issues one Passport stamp and corrections are reversible", async () => {
  const { createHash: hash } = require("node:crypto");
  const records = new Map([
    ["learning_items/jam-1", { id: "jam-1", slug: "galactic-jam", title: "Galactic Jam", isGameJam: true, confirmedCount: 1, reservedCount: 0, waitlistCount: 0 }],
    ["learning_enrollments/enrollment-1", { itemId: "jam-1", userId: "member", state: "confirmed" }],
  ]);
  const reference = (collection, id) => ({ collection, id, path: collection + "/" + id, get: async () => snapshot(collection, id) });
  const snapshot = (collection, id) => {
    const value = records.get(collection + "/" + id);
    return { exists: value !== undefined, id, ref: reference(collection, id), data: () => value };
  };
  let generatedId = 0;
  const db = {
    collection: (name) => ({
      doc: (id) => reference(name, id || "generated-" + (++generatedId)),
      where: () => ({ limit: () => ({ get: async () => ({ empty: false, docs: [{ ...snapshot(name, "jam-1"), ref: reference(name, "jam-1") }] }) }) }),
    }),
    runTransaction: async (callback) => {
      const writes = [];
      const transaction = {
        get: async (ref) => snapshot(ref.collection, ref.id),
        update: (ref, value) => writes.push(() => records.set(ref.path, { ...records.get(ref.path), ...value })),
        set: (ref, value, options = {}) => writes.push(() => records.set(ref.path, { ...(options.merge ? records.get(ref.path) : {}), ...value })),
        create: (ref, value) => writes.push(() => records.set(ref.path, value)),
      };
      const result = await callback(transaction);
      writes.forEach((write) => write());
      return result;
    },
  };
  const journalEvents = [];
  const route = loadSourceModule("src/app/api/learning-items/[slug]/participants/route.js", ["PATCH"], { stripImports: true, sandbox: {
    Response,
    adminDb: db,
    getRequestUser: async () => ({ uid: "organizer", admin: true }),
    isLearningManager: () => true,
    ENROLLMENT_STATES: ["attended", "did_not_attend", "completed"],
    getProductConfig: () => ({ featureFlags: { goGameJams: true, goDevelopmentJourney: true } }),
    courseUsesSeat: () => true,
    courseSeatCount: () => 0,
    offerNextWaitlisted: async () => {},
    cancelLearningEnrollment: async () => ({}),
    createProductNotification: async () => {},
    enqueueEmailEventForUsers: async () => {},
    appendJourneyEvent: (_transaction, event) => journalEvents.push(event),
    journeyEventId: (uid, type, sourceId) => hash("sha256").update("go-journey:v1:" + uid + ":" + type + ":" + sourceId).digest("hex"),
  } });
  const send = (state) => route.PATCH(new Request("https://go.test/api/learning-items/galactic-jam/participants", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ enrollmentId: "enrollment-1", state }) }), { params: { slug: "galactic-jam" } });
  const stampId = hash("sha256").update("go-stamp:v1:member:game_jam:jam-1").digest("hex");

  assert.equal((await send("attended")).status, 200);
  assert.equal(records.get("passport_stamps/" + stampId).status, "issued");
  assert.equal(journalEvents.length, 1);
  assert.equal(journalEvents[0].type, "game_jam_attended");
  assert.equal((await send("attended")).status, 200);
  assert.equal(journalEvents.length, 1);

  assert.equal((await send("completed")).status, 200);
  assert.equal(records.get("passport_stamps/" + stampId).status, "issued");
  assert.equal(journalEvents.length, 1);

  assert.equal((await send("did_not_attend")).status, 200);
  assert.equal(records.get("passport_stamps/" + stampId).status, "revoked");
  assert.equal(journalEvents.length, 2);
  assert.equal(journalEvents[1].status, "corrected");
});
