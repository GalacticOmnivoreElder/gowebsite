const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const mentorship = loadSourceModule("src/lib/mentorship.js", ["MENTORSHIP_CONSENT_VERSION", "MENTOR_CONDUCT_VERSION", "MENTOR_TERMS_VERSION", "MENTOR_REVIEW_DECISIONS", "normalizeMentorReviewDecision", "authorizeMentorshipAction", "cleanMentorApplicationProfile", "cleanMentorshipRequest", "serializeMentorProfile", "serializeMentorApplicationSummary", "serializeMentorshipApplication", "serializeMentorshipRequest"], { stripImports: true, sandbox: { hasCommunityContentAccess: (data, options = {}) => options.admin === true || data.activeMember === true } });

test("canonical access gates do not use allowlists", () => {
  const config = { featureFlags: { mentorshipSystem: true, publicMentorBrowsing: false, mentorshipRequests: true, mentorApplications: true } };
  assert.equal(mentorship.authorizeMentorshipAction({ uid: "member", userData: { activeMember: true } }, "browse_mentors", config).reason, "public_browsing_disabled");
  assert.equal(mentorship.authorizeMentorshipAction({ uid: "member", userData: { activeMember: true } }, "create_request", config).allowed, true);
  assert.equal(mentorship.authorizeMentorshipAction({ uid: "applicant", userData: {} }, "apply_mentor", config).allowed, true);
});

test("mentor submissions require current terms and public profile consent", () => {
  const base = { displayName: "Alex", professionalHeadline: "Designer", biography: "Practical design mentor", areasOfExpertise: ["Systems"], supportedDisciplines: ["Design"], toolsAndTechnologies: ["Unity"], languages: ["English"], availableFormats: ["online"], generalAvailability: "Weekday evenings", preferredMenteeLevels: ["beginner"], conflictOfInterestDeclaration: "None", publicProfileConsent: true, conductVersion: mentorship.MENTOR_CONDUCT_VERSION, termsVersion: mentorship.MENTOR_TERMS_VERSION };
  assert.equal(mentorship.cleanMentorApplicationProfile(base, { submitting: true }).publicProfileConsent, true);
  assert.throws(() => mentorship.cleanMentorApplicationProfile({ ...base, termsVersion: "outdated" }, { submitting: true }), /terms/);
});

test("mentor review decisions never reuse the submitted application status", () => {
  assert.equal(mentorship.normalizeMentorReviewDecision(" approved "), "approved");
  assert.equal(mentorship.normalizeMentorReviewDecision("submitted"), null);
  assert.deepEqual(Array.from(mentorship.MENTOR_REVIEW_DECISIONS), ["approved", "needs_information", "rejected", "paused", "suspended", "archived"]);
});

test("participant serializers exclude staff-only fields", () => {
  assert.doesNotMatch(JSON.stringify(mentorship.serializeMentorshipRequest("request-1", { internalReviewNotes: "restricted" })), /restricted/);
  assert.doesNotMatch(JSON.stringify(mentorship.serializeMentorProfile("mentor-1", { internalReviewNotes: "restricted" })), /restricted/);
  assert.doesNotMatch(JSON.stringify(mentorship.serializeMentorshipApplication("application-1", { internalNotes: "restricted" })), /restricted/);
});

test("admin mentor summaries expose scheduling invitation history", () => {
  const summary = mentorship.serializeMentorApplicationSummary(
    "mentor-1",
    { status: "approved", schedulingInviteSentAt: "2026-11-03T10:00:00.000Z", schedulingInviteCount: 2 },
    {}
  );
  assert.equal(summary.schedulingInviteSentAt, "2026-11-03T10:00:00.000Z");
  assert.equal(summary.schedulingInviteCount, 2);
});

test("one canonical backend and public route are wired", () => {
  const service = fs.readFileSync("src/lib/mentorship-service.js", "utf8");
  const admin = fs.readFileSync("src/components/admin/MentorshipAdminWorkspace.jsx", "utf8");
  const page = fs.readFileSync("src/app/mentorship/page.js", "utf8");
  const requestRoute = fs.readFileSync("src/app/api/mentorship/requests/route.js", "utf8");
  const adminRoute = fs.readFileSync("src/app/api/admin/mentorships/route.js", "utf8");
  for (const collection of ["mentorship_requests", "mentorship_suggestions", "mentorship_applications", "mentorship_engagements", "mentorship_checkins", "mentorship_reports", "mentorship_audit_events"]) assert.match(service, new RegExp(collection));
  assert.match(page, /MentorDirectory/);
  assert.match(admin, /Approve & publish/);
  assert.match(admin, /Open full application/);
  assert.match(admin, /send_mentor_scheduling_email/);
  assert.match(admin, /Publish to directory/);
  assert.match(service, /mentorPublicProfileEnabled: publicProfileReady/);
  assert.match(service, /mentor_application\.scheduling_invite_sent/);
  assert.match(service, /publishMentorProfile/);
  assert.match(service, /mentor_membership_required/);
  assert.match(adminRoute, /sendMentorSchedulingInvite/);
  assert.match(adminRoute, /publishMentorProfile/);
  assert.match(requestRoute, /create_request/);
});
