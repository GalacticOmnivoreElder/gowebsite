const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { MAX_PROFILE_BIO_LENGTH, validateProfileData } = loadSourceModule(
  "src/utils/validateProfile.js",
  ["MAX_PROFILE_BIO_LENGTH", "validateProfileData"]
);

test("validateProfileData accepts a complete valid profile patch", () => {
  assert.deepEqual(
    Object.keys(
      validateProfileData({
      bio: "Building small games and tools.",
      profilePrivacy: "public",
      skills: ["Unity", "Game Design"],
      socialLinks: {
        github: "https://github.com/go",
        portfolio: "",
      },
      username: "go_member-01",
      })
    ),
    []
  );
  assert.equal(
    Object.keys(validateProfileData({ username: "Galactic Omnivore" })).length,
    0
  );
  assert.equal(
    Object.keys(validateProfileData({ username: "Галактички Корисник" })).length,
    0
  );
});

test("validateProfileData rejects invalid usernames", () => {
  assert.equal(validateProfileData({ username: "" }).username, "Username is required");
  assert.equal(
    validateProfileData({ username: "go" }).username,
    "Username must be at least 3 characters"
  );
  assert.equal(
    validateProfileData({ username: "x".repeat(31) }).username,
    "Username must be 30 characters or less"
  );
  assert.equal(
    validateProfileData({ username: "go.member" }).username,
    "Username can only contain letters, numbers, spaces, underscores, and hyphens"
  );
});

test("validateProfileData accepts a bio at the 10,000 character boundary", () => {
  assert.deepEqual(
    Object.keys(validateProfileData({ bio: "x".repeat(MAX_PROFILE_BIO_LENGTH) })),
    []
  );
});

test("validateProfileData rejects oversized and malformed profile fields", () => {
  const errors = validateProfileData({
    bio: "x".repeat(MAX_PROFILE_BIO_LENGTH + 1),
    profilePrivacy: "friends",
    skills: Array.from({ length: 21 }, (_, index) => `skill-${index}`),
    socialLinks: {
      portfolio: "example.com",
    },
  });

  assert.equal(errors.bio, "Bio must be 10,000 characters or less");
  assert.equal(errors.profilePrivacy, "Profile privacy must be public or private");
  assert.equal(errors.skills, "You can select at most 20 skills");
  assert.equal(errors["socialLinks.portfolio"], "portfolio must be a valid URL");
});

test("validateProfileData requires skills to be an array", () => {
  assert.equal(validateProfileData({ skills: "Unity" }).skills, "Skills must be an array");
});

test("validateProfileData rejects empty or oversized skill tags", () => {
  assert.equal(
    validateProfileData({ skills: ["Unity", "   "] }).skills,
    "Each skill must be between 1 and 40 characters"
  );
  assert.equal(
    validateProfileData({ skills: ["x".repeat(41)] }).skills,
    "Each skill must be between 1 and 40 characters"
  );
});
