const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../../../tests/helpers/load-source-module.cjs");

const profiles = loadSourceModule("src/lib/mentor-profiles.js", [
  "canonicalMentorProfileFields",
  "getMentorCapacity",
  "normalizeMentorProfile",
  "toPublicMentorProfileDto",
], { stripImports: true });

const membership = loadSourceModule("src/lib/auth-utils.js", [
  "getEffectiveMembership",
  "hasActiveSubscription",
], { stripImports: true });

const entitlements = loadSourceModule("src/lib/content-entitlements.js", [
  "hasMentorToolAccess",
], { stripImports: true, sandbox: { getEffectiveMembership: membership.getEffectiveMembership } });

const mentorship = loadSourceModule("src/lib/mentorship.js", [
  "serializeMentorApplicationSummary",
  "serializeMentorshipRequest",
  "stableId",
], { stripImports: true, sandbox: { crypto: require("node:crypto") } });

function completeProfile(overrides = {}) {
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
    maximumActiveStudents: 4,
    activeEngagementCount: 1,
    ...overrides,
  };
}

test("mentor profiles use the canonical shared capacity fields", () => {
  const normalized = profiles.normalizeMentorProfile(completeProfile());
  assert.equal(profiles.getMentorCapacity(normalized).availableSlots, 3);
  assert.equal(profiles.toPublicMentorProfileDto("mentor-1", normalized).hasAvailableSlots, true);
  assert.equal(profiles.canonicalMentorProfileFields(normalized).maximumActiveStudents, 4);
});

test("mentor application summaries expose customer guidance without staff notes", () => {
  const summary = mentorship.serializeMentorApplicationSummary("mentor-1", {
    status: "needs_information",
    customerMessage: "Please add one relevant portfolio link.",
    internalReviewNotes: "Restricted reviewer note",
  });
  assert.equal(summary.customerMessage, "Please add one relevant portfolio link.");
  assert.match(summary.nextAction, /requested information/i);
  assert.doesNotMatch(JSON.stringify(summary), /Restricted reviewer note/);
});

test("scheduled cancellation retains every tier through the paid-through date", () => {
  const now = new Date("2026-09-08T12:00:00.000Z");
  for (const membershipTier of ["member", "mentor", "company"]) {
    for (const subscriptionInterval of ["month", "year"]) {
      const user = {
        activeMember: false,
        membershipTier,
        subscriptionEndsAt: "2026-10-08T12:00:00.000Z",
        subscriptionInterval,
        subscriptionStatus: "canceled",
      };
      const effective = membership.getEffectiveMembership(user, { now });
      assert.equal(effective.activeMember, true, `${membershipTier}/${subscriptionInterval}`);
      assert.equal(effective.membershipTier, membershipTier);
    }
  }
});

test("refunds, revocations, and an ended paid-through period remove benefits", () => {
  const now = new Date("2026-10-09T12:00:00.000Z");
  assert.equal(membership.hasActiveSubscription({ activeMember: true, subscriptionStatus: "refunded", subscriptionEndsAt: "2026-11-01T00:00:00.000Z" }, now), false);
  assert.equal(membership.hasActiveSubscription({ activeMember: true, subscriptionStatus: "revoked", subscriptionEndsAt: "2026-11-01T00:00:00.000Z" }, now), false);
  assert.equal(membership.hasActiveSubscription({ activeMember: true, subscriptionStatus: "canceled", subscriptionEndsAt: "2026-10-08T12:00:00.000Z" }, now), false);
});

test("mentor tools require approval and current Mentor membership", () => {
  const now = new Date("2026-09-08T12:00:00.000Z");
  const approvedPaidThrough = { mentorStatus: "approved", membershipTier: "mentor", subscriptionStatus: "canceled", subscriptionEndsAt: "2026-10-08T12:00:00.000Z" };
  assert.equal(entitlements.hasMentorToolAccess(approvedPaidThrough, { now }), true);
  assert.equal(entitlements.hasMentorToolAccess({ ...approvedPaidThrough, mentorStatus: "suspended" }, { now }), false);
  assert.equal(entitlements.hasMentorToolAccess({ ...approvedPaidThrough, membershipTier: "member" }, { now }), false);
});

test("public mentorship responses exclude private review notes", () => {
  const request = mentorship.serializeMentorshipRequest("request-1", {
    requestedMentorId: "mentor-1",
    requestedMentorProfile: { displayName: "Mira Mentor", availableSlots: 1 },
    internalReviewNotes: "Restricted",
    status: "submitted",
  });
  assert.equal(request.requestedMentorId, "mentor-1");
  assert.doesNotMatch(JSON.stringify(request), /Restricted/);
});

test("active UI and services use the canonical mentorship route and names", () => {
  const navigation = fs.readFileSync("src/lib/navigation.js", "utf8");
  const publicPage = fs.readFileSync("src/app/mentorship/page.js", "utf8");
  const dashboard = fs.readFileSync("src/components/mentors/MentorshipDashboard.jsx", "utf8");
  const admin = fs.readFileSync("src/components/admin/MentorshipAdminWorkspace.jsx", "utf8");
  const service = fs.readFileSync("src/lib/mentorship-service.js", "utf8");
  assert.match(navigation, /href: "\/mentorship", label: "Mentorship"/);
  assert.match(publicPage, /MentorDirectory/);
  assert.match(dashboard, /MentorshipRequestWorkspace/);
  assert.match(admin, /Reason for deletion/);
  assert.match(service, /DELETABLE_MENTOR_APPLICATION_STATUSES/);
  assert.match(service, /mentorship_requests/);
});
