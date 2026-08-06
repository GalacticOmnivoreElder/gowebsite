const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const pilot = loadSourceModule("src/lib/mentorship-pilot.js", [
  "MENTORSHIP_CONSENT_VERSION",
  "MENTOR_CONDUCT_VERSION",
  "MENTOR_TERMS_VERSION",
  "authorizeMentorshipAction",
  "cleanMentorPilotProfile",
  "cleanMentorshipAgreement",
  "cleanMentorshipPilotRequest",
  "serializeMentorPilotProfile",
  "serializePilotApplication",
  "serializePilotRequest",
], {
  stripImports: true,
  sandbox: {
    hasCommunityContentAccess: (data, options = {}) => options.admin === true || data.activeMember === true,
  },
});

test("pilot access fails closed and does not imply public browsing", () => {
  const config = {
    featureFlags: { mentorshipSystem: true, publicMentorBrowsing: false, mentorshipRequests: true, mentorApplications: true, pilotOnly: true },
    pilotUserIds: ["pilot"],
  };
  assert.equal(pilot.authorizeMentorshipAction({ uid: "other", userData: { activeMember: true } }, "create_request", config).reason, "pilot_access_required");
  assert.equal(pilot.authorizeMentorshipAction({ uid: "pilot", userData: { activeMember: true } }, "browse_mentors", config).reason, "public_browsing_disabled");
  assert.equal(pilot.authorizeMentorshipAction({ uid: "pilot", userData: { activeMember: true } }, "create_request", config).allowed, true);
  assert.equal(pilot.authorizeMentorshipAction({ uid: "admin", admin: true, userData: {} }, "create_request", config).allowed, true);
});

test("pilot request validation records consent and rejects incomplete submissions", () => {
  const request = pilot.cleanMentorshipPilotRequest({ title: "Combat prototype", goal: "Finish one playable encounter", discipline: "Design", currentLevel: "intermediate", desiredOutcome: "A tested vertical slice", preferredTimeframe: "two_to_four_weeks", languagePreferences: ["English"], timeZone: "Europe/Warsaw", availability: "Tuesday evenings", preferredFormat: "online", dataSharingConsent: true, expectationsAcknowledged: true }, { submitting: true });
  assert.equal(request.consentVersion, pilot.MENTORSHIP_CONSENT_VERSION);
  assert.throws(() => pilot.cleanMentorshipPilotRequest({ title: "Missing goal" }, { submitting: true }), /required/);
});

test("mentor submission requires approval terms and public consent", () => {
  const base = { displayName: "Alex", professionalHeadline: "Designer", biography: "Practical design mentor", areasOfExpertise: ["Systems"], supportedDisciplines: ["Design"], toolsAndTechnologies: ["Unity"], languages: ["English"], availableFormats: ["online"], generalAvailability: "Weekday evenings", preferredMenteeLevels: ["beginner"], conflictOfInterestDeclaration: "No current conflicts", publicProfileConsent: true, conductVersion: pilot.MENTOR_CONDUCT_VERSION, termsVersion: pilot.MENTOR_TERMS_VERSION };
  assert.equal(pilot.cleanMentorPilotProfile(base, { submitting: true }).publicProfileConsent, true);
  assert.throws(() => pilot.cleanMentorPilotProfile({ ...base, termsVersion: "old" }, { submitting: true }), /terms/);
});

test("participant serializers exclude staff notes and unrelated private fields", () => {
  const request = pilot.serializePilotRequest("request-1", { menteeUserId: "member", title: "Goal", goal: "Goal text", status: "suggestions_sent", internalReviewNotes: "never show", accessibilityRequest: "private support" });
  assert.doesNotMatch(JSON.stringify(request), /never show/);
  const mentor = pilot.serializeMentorPilotProfile("mentor-1", { displayName: "Mentor", status: "approved", publicProfileConsent: true, internalReviewNotes: "staff", accessibilityInformation: "private" });
  assert.doesNotMatch(JSON.stringify(mentor), /staff|private/);
  const application = pilot.serializePilotApplication("application-1", { message: "short", internalNotes: "staff" });
  assert.doesNotMatch(JSON.stringify(application), /staff/);
});

test("pilot implementation uses separate records, transactions, capacity checks, and server-only storage", () => {
  const service = fs.readFileSync("src/lib/mentorship-pilot-service.js", "utf8");
  const rules = fs.readFileSync("firestore.rules", "utf8");
  const requestRoute = fs.readFileSync("src/app/api/mentorship/pilot/requests/route.js", "utf8");
  const engagementRoute = fs.readFileSync("src/app/api/mentorship/pilot/engagements/[engagementId]/route.js", "utf8");
  for (const collection of ["mentorship_pilot_requests", "mentorship_suggestions", "mentorship_applications", "mentorship_pilot_engagements", "mentorship_checkins", "mentorship_reports", "mentorship_audit_events"]) assert.match(service, new RegExp(collection));
  assert.match(service, /runTransaction/);
  assert.match(service, /pilotActiveEngagementCount/);
  assert.match(service, /dataSharingConsent/);
  assert.match(requestRoute, /create_request/);
  assert.match(engagementRoute, /updateMentorshipPilotEngagement/);
  for (const collection of ["mentor_applications", "mentorship_applications", "mentorship_suggestions", "mentorship_pilot_requests", "mentorship_pilot_engagements", "mentorship_checkins", "mentorship_reports", "mentorship_audit_events"]) assert.match(rules, new RegExp(`match \/${collection}\/\\{doc\\}\\s+\\{ allow read, write: if false; \\}`));
});

test("legacy public mentor surfaces also require the pilot browsing gate", () => {
  for (const file of ["src/app/mentors/page.js", "src/app/api/mentors/route.js", "src/app/api/mentors/[mentorId]/route.js"]) {
    const source = fs.readFileSync(file, "utf8");
    assert.match(source, /getMentorshipPilotConfig/);
    assert.match(source, /publicMentorBrowsing/);
    assert.match(source, /mentorshipSystem/);
  }
});

test("the public application surface opens while pilot matching stays controlled", () => {
  const configSource = fs.readFileSync("src/lib/product-config.js", "utf8");
  const pageSource = fs.readFileSync("src/app/matchmaking/page.js", "utf8");
  assert.match(configSource, /MENTORSHIP_SYSTEM_ENABLED, true/);
  assert.match(configSource, /MENTORSHIP_REQUESTS_ENABLED, true/);
  assert.match(configSource, /MENTORSHIP_PILOT_ONLY, false/);
  assert.match(pageSource, /Applications are open to eligible GO members/);
});
