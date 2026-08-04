const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const mentorship = loadSourceModule(
  "src/lib/mentorship.js",
  [
    "ACTIVE_ENGAGEMENT_STATUSES",
    "addWorkingDays",
    "canSubmitMentorshipRequest",
    "cleanMentorshipRequest",
    "scoreMentorCompatibility",
    "serializeMentorshipEngagement",
  ],
  {
    stripImports: true,
    sandbox: {
      hasCommunityContentAccess: (data, options = {}) => options.admin === true || (data.activeMember === true && ["member", "company"].includes(data.membershipTier)),
      MENTOR_FORMATS: ["online", "in_person", "hybrid"],
      MENTOR_LEVELS: ["beginner", "intermediate", "advanced", "all_levels"],
    },
  }
);

function request(overrides = {}) {
  return {
    learningObjective: "Improve a playable vertical slice",
    discipline: "Game Design",
    skillLevel: "intermediate",
    preferredLanguage: "English",
    preferredFormat: "online",
    availabilityDays: [1, 3],
    timeZone: "Europe/Warsaw",
    expectedDuration: "two_to_four_weeks",
    ...overrides,
  };
}

test("Phase 4 mentorship is adult self-service for Community, Business, or admins", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(mentorship.canSubmitMentorshipRequest(null, { isAdult: true }))), { allowed: false, reason: "authentication_required" });
  assert.equal(mentorship.canSubmitMentorshipRequest({ uid: "free", userData: {} }, { isAdult: true }).reason, "community_membership_required");
  assert.equal(mentorship.canSubmitMentorshipRequest({ uid: "member", userData: { activeMember: true, membershipTier: "member" } }, { isAdult: false }).reason, "adult_confirmation_required");
  assert.equal(mentorship.canSubmitMentorshipRequest({ uid: "member", userData: { activeMember: true, membershipTier: "member" } }, { isAdult: true }).allowed, true);
  assert.equal(mentorship.canSubmitMentorshipRequest({ uid: "business", userData: { activeMember: true, membershipTier: "company" } }, { isAdult: true }).allowed, true);
  assert.equal(mentorship.canSubmitMentorshipRequest({ uid: "admin", admin: true, userData: {} }, { isAdult: true }).allowed, true);
});

test("mentor compatibility respects profile fit, private availability, capacity, and pause state", () => {
  const clean = mentorship.cleanMentorshipRequest(request());
  const profile = {
    disciplines: ["Game Design"],
    skills: ["Systems Design"],
    supportedStudentLevels: ["intermediate"],
    languages: ["English"],
    mentorshipFormats: ["online"],
    currentlyAcceptingStudents: true,
    maximumActiveStudents: 2,
  };
  const availability = {
    currentlyAcceptingStudents: true,
    temporaryPause: false,
    sessionFormats: ["online"],
    recurringWindows: [{ dayOfWeek: 1, startsAt: "18:00", endsAt: "19:00" }],
  };
  const result = mentorship.scoreMentorCompatibility(clean, profile, availability, 1);
  assert.equal(result.score, 100);
  assert.equal(result.capacityRemaining, 1);
  assert.deepEqual(Array.from(result.reasons), ["Subject match", "Supports your level", "Language match", "Format match", "General availability overlaps"]);
  assert.equal(mentorship.scoreMentorCompatibility(clean, profile, { ...availability, temporaryPause: true }, 0), null);
  assert.equal(mentorship.scoreMentorCompatibility(clean, profile, availability, 2), null);
});

test("mentor response deadlines skip weekends", () => {
  assert.equal(mentorship.addWorkingDays(new Date("2026-08-07T12:00:00.000Z"), 1).toISOString(), "2026-08-10T12:00:00.000Z");
  assert.equal(mentorship.addWorkingDays(new Date("2026-08-03T12:00:00.000Z"), 5).toISOString(), "2026-08-10T12:00:00.000Z");
});

test("meeting links stay out of non-participant engagement serialization", () => {
  const engagement = {
    studentId: "student",
    mentorId: "mentor",
    status: "scheduling",
    proposedSlots: [{ startsAt: new Date("2026-08-20T10:00:00Z"), endsAt: new Date("2026-08-20T11:00:00Z"), timeZone: "Europe/Warsaw", meetingUrl: "https://meet.example/private" }],
  };
  assert.doesNotMatch(JSON.stringify(mentorship.serializeMentorshipEngagement("engagement", engagement)), /meet\.example|meetingUrl/);
  assert.match(JSON.stringify(mentorship.serializeMentorshipEngagement("engagement", engagement, { includePrivateSchedule: true })), /meet\.example/);
});

test("Phase 4 mentorship routes and UI enforce gates, participant privacy, lifecycle states, and atomic overrides", () => {
  const service = fs.readFileSync("src/lib/mentorship-service.js", "utf8");
  const requestRoute = fs.readFileSync("src/app/api/mentorship/requests/route.js", "utf8");
  const concernRoute = fs.readFileSync("src/app/api/mentorship/engagements/[engagementId]/concerns/route.js", "utf8");
  const adminRoute = fs.readFileSync("src/app/api/admin/mentorships/route.js", "utf8");
  const workspace = fs.readFileSync("src/components/mentors/MentorshipRequestWorkspace.jsx", "utf8");
  const dashboard = fs.readFileSync("src/components/mentors/MentorshipDashboard.jsx", "utf8");
  const rules = fs.readFileSync("firestore.rules", "utf8");

  assert.match(requestRoute, /featureFlags\.mentorMatchmaking/);
  assert.match(requestRoute, /canSubmitMentorshipRequest/);
  assert.match(service, /mentorship_active_requests/);
  assert.match(service, /requestIds/);
  assert.match(service, /transaction\.delete\(overrideRef\)/);
  assert.match(adminRoute, /allow_additional_request/);
  assert.match(concernRoute, /\[engagementDoc\.data\(\)\.studentId, engagementDoc\.data\(\)\.mentorId\]\.includes\(user\.uid\)/);
  assert.match(rules, /match \/mentorship_concerns\/\{doc\}\s+\{ allow read, write: if false; \}/);
  assert.match(rules, /match \/mentorship_request_overrides\/\{doc\}\s+\{ allow read, write: if false; \}/);
  for (const text of ["Checking compatibility", "No available mentor", "GO assistance", "I confirm I am 18 or older"]) assert.match(workspace, new RegExp(text, "i"));
  for (const text of ["propose", "confirm", "cancel", "concern", "completion"]) assert.match(dashboard, new RegExp(text, "i"));
});
