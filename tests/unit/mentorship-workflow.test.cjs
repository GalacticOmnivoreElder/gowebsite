const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const mentorship = loadSourceModule("src/lib/mentorship.js", ["MENTORSHIP_CONSENT_VERSION", "MENTOR_CONDUCT_VERSION", "MENTOR_TERMS_VERSION", "authorizeMentorshipAction", "cleanMentorApplicationProfile", "cleanMentorshipRequest", "serializeMentorProfile", "serializeMentorshipApplication", "serializeMentorshipRequest"], { stripImports: true, sandbox: { hasCommunityContentAccess: (data, options = {}) => options.admin === true || data.activeMember === true } });

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

test("participant serializers exclude staff-only fields", () => {
  assert.doesNotMatch(JSON.stringify(mentorship.serializeMentorshipRequest("request-1", { internalReviewNotes: "restricted" })), /restricted/);
  assert.doesNotMatch(JSON.stringify(mentorship.serializeMentorProfile("mentor-1", { internalReviewNotes: "restricted" })), /restricted/);
  assert.doesNotMatch(JSON.stringify(mentorship.serializeMentorshipApplication("application-1", { internalNotes: "restricted" })), /restricted/);
});

test("one canonical backend and public route are wired", () => {
  const service = fs.readFileSync("src/lib/mentorship-service.js", "utf8");
  const page = fs.readFileSync("src/app/mentorship/page.js", "utf8");
  const requestRoute = fs.readFileSync("src/app/api/mentorship/requests/route.js", "utf8");
  for (const collection of ["mentorship_requests", "mentorship_suggestions", "mentorship_applications", "mentorship_engagements", "mentorship_checkins", "mentorship_reports", "mentorship_audit_events"]) assert.match(service, new RegExp(collection));
  assert.match(page, /MentorDirectory/);
  assert.match(requestRoute, /create_request/);
});
