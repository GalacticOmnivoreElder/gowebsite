const assert = require("node:assert/strict");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const profiles = loadSourceModule(
  "src/lib/mentor-profiles.js",
  [
    "cleanMentorAvailability",
    "cleanMentorProfile",
    "isMentorProfileComplete",
    "publicAvailabilitySummary",
    "toPublicMentorProfileDto",
  ],
  { stripImports: true }
);
const visibility = loadSourceModule(
  "src/lib/content-visibility.js",
  ["isPublicMentorProfile"]
);
const directory = loadSourceModule(
  "src/lib/mentor-directory.js",
  ["getPublicMentor", "listPublicMentors"],
  {
    stripImports: true,
    sandbox: { adminDb: {}, ...profiles, ...visibility },
  }
);

function completeProfile(overrides = {}) {
  return {
    displayName: "Alex Mentor",
    profileImage: "https://example.com/alex.png",
    biography: "Environment artist and practical mentor.",
    disciplines: ["Art"],
    skills: ["Environment Art", "Lighting"],
    supportedStudentLevels: ["beginner", "intermediate"],
    languages: ["English"],
    mentorshipFormats: ["online"],
    locationPreference: "online",
    timeZone: "Europe/Skopje",
    availabilitySummary: "limited",
    currentlyAcceptingStudents: true,
    maximumActiveStudents: 3,
    portfolioLinks: [{ label: "Portfolio", url: "https://example.com/work" }],
    relatedLearningSlugs: ["environment-art"],
    relatedVideoBundleSlugs: ["lighting-basics"],
    ...overrides,
  };
}

function createDirectoryDb(users, mentorProfiles) {
  const snapshot = (id, data) => ({ id, exists: data !== undefined, data: () => data });
  return {
    collection(name) {
      if (name === "users") {
        return {
          where(field, operator, expected) {
            assert.equal(field, "mentorStatus");
            assert.equal(operator, "==");
            return {
              limit() {
                return {
                  async get() {
                    return {
                      docs: Object.entries(users)
                        .filter(([, data]) => data[field] === expected)
                        .map(([id, data]) => snapshot(id, data)),
                    };
                  },
                };
              },
            };
          },
          doc(id) {
            return { get: async () => snapshot(id, users[id]) };
          },
        };
      }
      assert.equal(name, "mentor_profiles");
      return {
        doc(id) {
          return { get: async () => snapshot(id, mentorProfiles[id]) };
        },
      };
    },
  };
}

test("mentor public DTOs contain approved profile fields but never private contact or schedule data", () => {
  const dto = profiles.toPublicMentorProfileDto("mentor-1", completeProfile({
    email: "private@example.com",
    phone: "+389000000",
    cv: "private-cv",
    internalNotes: "private notes",
    recurringWindows: [{ dayOfWeek: 1, startsAt: "18:00", endsAt: "19:00" }],
    individualDates: [{ date: "2026-08-10", startsAt: "18:00", endsAt: "19:00" }],
  }));
  const serialized = JSON.stringify(dto);
  assert.equal(dto.displayName, "Alex Mentor");
  assert.equal(dto.generalAvailability, "limited");
  assert.doesNotMatch(serialized, /private@example|389000000|private-cv|private notes|recurringWindows|individualDates|startsAt|endsAt/);
});

test("mentor profile and availability validation keeps only supported public and private values", () => {
  const profile = profiles.cleanMentorProfile(completeProfile({
    mentorshipFormats: ["online", "telepathy"],
    supportedStudentLevels: ["beginner", "wizard"],
  }));
  assert.equal(profiles.isMentorProfileComplete(profile), true);
  assert.deepEqual(Array.from(profile.mentorshipFormats), ["online"]);
  assert.deepEqual(Array.from(profile.supportedStudentLevels), ["beginner"]);

  const availability = profiles.cleanMentorAvailability({
    timeZone: "Europe/Warsaw",
    sessionFormats: ["online"],
    subjectsCurrentlyAccepted: ["Lighting"],
    mentoringModes: ["individual"],
    maximumActiveStudents: 2,
    currentlyAcceptingStudents: true,
    availabilityStatus: "limited",
    recurringWindows: [{ dayOfWeek: 2, startsAt: "18:00", endsAt: "19:00", formats: ["online"] }],
    individualDates: [{ date: "2026-08-12", startsAt: "17:00", endsAt: "18:00", formats: ["online"] }],
  });
  assert.equal(profiles.publicAvailabilitySummary(availability), "limited");
  assert.equal(profiles.publicAvailabilitySummary({ ...availability, temporaryPause: true }), "unavailable");
  assert.throws(
    () => profiles.cleanMentorAvailability({ recurringWindows: [{ dayOfWeek: 1, startsAt: "19:00", endsAt: "18:00" }] }),
    /must end after/
  );
});

test("the directory returns only approved, public, complete mentor profiles", async () => {
  const db = createDirectoryDb(
    {
      approved: { mentorStatus: "approved", mentorPublicProfileEnabled: true },
      private: { mentorStatus: "approved", mentorPublicProfileEnabled: false },
      incomplete: { mentorStatus: "approved", mentorPublicProfileEnabled: true },
      paused: { mentorStatus: "temporarily_unavailable", mentorPublicProfileEnabled: true },
      suspended: { mentorStatus: "suspended", mentorPublicProfileEnabled: true },
    },
    {
      approved: completeProfile(),
      private: completeProfile({ displayName: "Private Mentor" }),
      incomplete: completeProfile({ skills: [] }),
      paused: completeProfile({ displayName: "Paused Mentor" }),
      suspended: completeProfile({ displayName: "Suspended Mentor" }),
    }
  );

  const mentors = await directory.listPublicMentors({
    db,
    filters: { skill: "Lighting", language: "English", accepting: "true" },
  });
  assert.equal(mentors.length, 1);
  assert.equal(mentors[0].id, "approved");
  assert.equal(await directory.getPublicMentor("paused", { db }), null);
  assert.equal(visibility.isPublicMentorProfile({ mentorStatus: "approved", publicProfileEnabled: true }), true);
  assert.equal(visibility.isPublicMentorProfile({ mentorStatus: "temporarily_unavailable", publicProfileEnabled: true }), false);
});

test("Phase 3 mentor UI exposes filters and labels exact availability as private", () => {
  const directorySource = fs.readFileSync("src/components/mentors/MentorDirectory.jsx", "utf8");
  const workspaceSource = fs.readFileSync("src/components/mentors/MentorWorkspace.jsx", "utf8");
  const rules = fs.readFileSync("firestore.rules", "utf8");
  for (const filter of ["discipline", "skill", "level", "language", "format", "availability", "accepting"]) {
    assert.match(directorySource, new RegExp(filter, "i"));
  }
  for (const state of ["Loading approved mentors", "Mentors could not be loaded", "No approved mentors match"]) {
    assert.match(directorySource, new RegExp(state));
  }
  assert.match(workspaceSource, /Private availability/);
  assert.match(workspaceSource, /Exact windows remain private/);
  assert.match(rules, /match \/mentor_profiles\/\{doc\}\s+\{ allow read, write: if false; \}/);
  assert.match(rules, /match \/mentor_availability\/\{doc\}\s+\{ allow read, write: if false; \}/);
});

test("mentor feature flags and approved status block direct URL access", async () => {
  const publicRoute = loadSourceModule(
    "src/app/api/mentors/route.js",
    ["GET"],
    {
      stripImports: true,
      sandbox: {
        Response,
        getProductConfig: () => ({ featureFlags: { mentorDirectory: false } }),
        listPublicMentors: async () => { throw new Error("must not query"); },
      },
    }
  );
  const disabled = await publicRoute.GET(new Request("https://example.com/api/mentors"));
  assert.equal(disabled.status, 503);

  const profileRoute = loadSourceModule(
    "src/app/api/me/mentor-profile/route.js",
    ["PATCH"],
    {
      stripImports: true,
      sandbox: {
        Response,
        adminDb: {},
        cleanMentorProfile: profiles.cleanMentorProfile,
        getProductConfig: () => ({ featureFlags: { mentorDirectory: true } }),
        getRequestUser: async () => ({ uid: "applicant", userData: { mentorStatus: "applicant" } }),
        serializeMentorDate: () => null,
      },
    }
  );
  const forbidden = await profileRoute.PATCH({ json: async () => completeProfile() });
  assert.equal(forbidden.status, 403);

  const availabilityRoute = loadSourceModule(
    "src/app/api/me/mentor-availability/route.js",
    ["GET"],
    {
      stripImports: true,
      sandbox: {
        Response,
        adminDb: {},
        getProductConfig: () => ({ featureFlags: { mentorAvailability: false } }),
        getRequestUser: async () => { throw new Error("must not authenticate"); },
      },
    }
  );
  assert.equal((await availabilityRoute.GET({})).status, 503);
});
