const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const profiles = loadSourceModule("src/lib/mentor-profiles.js", ["cleanMentorAvailability", "cleanMentorProfile", "getMentorCapacity", "isMentorProfileComplete", "publicAvailabilitySummary", "toPublicMentorProfileDto"], { stripImports: true });
const visibility = loadSourceModule("src/lib/content-visibility.js", ["isPublicMentorProfile"]);

function completeProfile(overrides = {}) {
  return { displayName: "Alex Mentor", profileImage: "https://example.com/alex.png", professionalHeadline: "Environment artist", biography: "Environment artist and practical mentor.", disciplines: ["Art"], skills: ["Lighting"], supportedStudentLevels: ["beginner"], languages: ["English"], mentorshipFormats: ["online"], locationPreference: "online", timeZone: "Europe/Skopje", availabilitySummary: "limited", currentlyAcceptingStudents: true, maximumActiveStudents: 3, activeEngagementCount: 1, portfolioLinks: [{ label: "Portfolio", url: "https://example.com/work" }], ...overrides };
}

test("public mentor DTOs contain approved profile fields without private contact or schedules", () => {
  const dto = profiles.toPublicMentorProfileDto("mentor-1", completeProfile({ email: "private@example.com", recurringWindows: [{ startsAt: "18:00" }] }));
  assert.equal(dto.displayName, "Alex Mentor");
  assert.equal(dto.availableSlots, 2);
  assert.doesNotMatch(JSON.stringify(dto), /private@example|recurringWindows|startsAt/);
});

test("mentor profile and availability validation accepts only supported values", () => {
  const profile = profiles.cleanMentorProfile(completeProfile({ mentorshipFormats: ["online", "telepathy"] }));
  assert.equal(profiles.isMentorProfileComplete(profile), true);
  assert.deepEqual(Array.from(profile.mentorshipFormats), ["online"]);
  const availability = profiles.cleanMentorAvailability({ timeZone: "Europe/Warsaw", sessionFormats: ["online"], subjectsCurrentlyAccepted: ["Lighting"], mentoringModes: ["individual"], maximumActiveStudents: 2, currentlyAcceptingStudents: true, availabilityStatus: "limited", recurringWindows: [{ dayOfWeek: 2, startsAt: "18:00", endsAt: "19:00", formats: ["online"] }] });
  assert.equal(profiles.publicAvailabilitySummary(availability), "limited");
});

test("only approved enabled mentors are public", () => {
  assert.equal(visibility.isPublicMentorProfile({ mentorStatus: "approved", publicProfileEnabled: true }), true);
  assert.equal(visibility.isPublicMentorProfile({ mentorStatus: "suspended", publicProfileEnabled: true }), false);
  assert.equal(visibility.isPublicMentorProfile({ mentorStatus: "approved", publicProfileEnabled: false }), false);
});

test("mentor directory and tools use canonical security gates", () => {
  const directory = fs.readFileSync("src/lib/mentor-directory.js", "utf8");
  const profileRoute = fs.readFileSync("src/app/api/me/mentor-profile/route.js", "utf8");
  const availabilityRoute = fs.readFileSync("src/app/api/me/mentor-availability/route.js", "utf8");
  const rules = fs.readFileSync("firestore.rules", "utf8");
  assert.match(directory, /hasMentorToolAccess/);
  assert.match(profileRoute, /Active verified Mentor membership is required/);
  assert.match(availabilityRoute, /Active verified Mentor membership is required/);
  assert.match(rules, /match \/mentor_profiles\/\{doc\}\s+\{ allow read, write: if false; \}/);
  assert.match(rules, /match \/mentor_availability\/\{doc\}\s+\{ allow read, write: if false; \}/);
});
