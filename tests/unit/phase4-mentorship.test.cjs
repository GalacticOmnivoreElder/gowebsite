const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const mentorship = loadSourceModule("src/lib/mentorship.js", ["MENTORSHIP_CONSENT_VERSION", "authorizeMentorshipAction", "cleanMentorshipRequest", "serializeMentorshipEngagement"], { stripImports: true, sandbox: { hasCommunityContentAccess: (data, options = {}) => options.admin === true || data.activeMember === true } });
const config = { featureFlags: { mentorshipSystem: true, publicMentorBrowsing: true, mentorshipRequests: true, mentorApplications: true } };

test("mentorship requests require authentication, paid access, and current consent", () => {
  assert.equal(mentorship.authorizeMentorshipAction(null, "create_request", config).reason, "authentication_required");
  assert.equal(mentorship.authorizeMentorshipAction({ uid: "free", userData: {} }, "create_request", config).reason, "mentorship_membership_required");
  assert.equal(mentorship.authorizeMentorshipAction({ uid: "member", userData: { activeMember: true } }, "create_request", config).allowed, true);
  const request = mentorship.cleanMentorshipRequest({ title: "Combat prototype", goal: "Finish one playable encounter", discipline: "Design", currentLevel: "intermediate", desiredOutcome: "A tested vertical slice", preferredTimeframe: "two_to_four_weeks", languagePreferences: ["English"], timeZone: "Europe/Warsaw", availability: "Tuesday evenings", preferredFormat: "online", dataSharingConsent: true, expectationsAcknowledged: true }, { submitting: true });
  assert.equal(request.consentVersion, mentorship.MENTORSHIP_CONSENT_VERSION);
});

test("public engagement serialization does not expose private communication data", () => {
  const serialized = mentorship.serializeMentorshipEngagement("engagement-1", { mentorId: "mentor", menteeUserId: "member", status: "active", communicationChannel: "https://meet.example/private" });
  assert.doesNotMatch(JSON.stringify(serialized), /meet\.example|communicationChannel/);
});

test("canonical mentorship routes, locks, safety reports, and audit storage are present", () => {
  const service = fs.readFileSync("src/lib/mentorship-service.js", "utf8");
  const requestRoute = fs.readFileSync("src/app/api/mentorship/requests/route.js", "utf8");
  const reportRoute = fs.readFileSync("src/app/api/mentorship/engagements/[engagementId]/report/route.js", "utf8");
  const rules = fs.readFileSync("firestore.rules", "utf8");
  assert.match(service, /mentorship_active_requests/);
  assert.match(service, /runTransaction/);
  assert.match(service, /mentorship_audit_events/);
  assert.match(requestRoute, /create_request/);
  assert.match(reportRoute, /submitMentorshipReport/);
  assert.match(rules, /match \/mentorship_requests\/\{doc\}/);
  assert.match(rules, /match \/mentorship_reports\/\{doc\}/);
});
