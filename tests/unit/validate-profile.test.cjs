const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const { validateProfileData } = loadSourceModule("src/utils/validateProfile.js", [
  "validateProfileData",
]);

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

test("validateProfileData rejects oversized and malformed profile fields", () => {
  const errors = validateProfileData({
    bio: "x".repeat(501),
    profilePrivacy: "friends",
    skills: Array.from({ length: 21 }, (_, index) => `skill-${index}`),
    socialLinks: {
      portfolio: "example.com",
    },
  });

  assert.equal(errors.bio, "Bio must be 500 characters or less");
  assert.equal(errors.profilePrivacy, "Profile privacy must be public or private");
  assert.equal(errors.skills, "You can select at most 20 skills");
  assert.equal(errors["socialLinks.portfolio"], "portfolio must be a valid URL");
});

test("validateProfileData requires skills to be an array", () => {
  assert.equal(validateProfileData({ skills: "Unity" }).skills, "Skills must be an array");
});

test("validateProfileData accepts generated avatars and rejects invalid image data", () => {
  assert.deepEqual(
    Object.keys(
      validateProfileData({
        avatar: "data:image/svg+xml;base64,PHN2Zy8+",
      })
    ),
    []
  );
  assert.equal(
    validateProfileData({ avatar: "javascript:alert(1)" }).avatar,
    "Profile image must be a valid image URL"
  );
});
