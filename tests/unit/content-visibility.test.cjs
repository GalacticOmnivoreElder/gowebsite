const assert = require("node:assert/strict");
const test = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const visibility = loadSourceModule("src/lib/content-visibility.js", [
  "isPublicLearningStatus",
  "isPublicMentorProfile",
  "isPublicResourceStatus",
  "isPublicVideoBundleStatus",
  "toPublicResourceDto",
]);

test("visibility helpers allow only explicit public states", () => {
  for (const status of ["published", "legacy"]) assert.equal(visibility.isPublicResourceStatus(status), true);
  for (const status of [undefined, null, "", "draft", "scheduled", "archived", "rejected", "private"]) assert.equal(visibility.isPublicResourceStatus(status), false);
  assert.equal(visibility.isPublicVideoBundleStatus("published"), true);
  for (const status of ["draft", "legacy", "scheduled", "archived"]) assert.equal(visibility.isPublicVideoBundleStatus(status), false);

  for (const status of ["enrollment_open", "enrollment_closed", "full", "waitlist_available", "in_progress", "completed", "canceled"]) {
    assert.equal(visibility.isPublicLearningStatus(status), true);
  }
  for (const status of [undefined, "draft", "scheduled", "archived", "private"]) assert.equal(visibility.isPublicLearningStatus(status), false);
});

test("mentor profiles require approval and explicit public consent", () => {
  assert.equal(visibility.isPublicMentorProfile({ mentorStatus: "approved", publicProfileEnabled: true }), true);
  for (const mentorStatus of ["applicant", "temporarily_unavailable", "suspended", "inactive", "rejected"]) {
    assert.equal(visibility.isPublicMentorProfile({ mentorStatus, publicProfileEnabled: true }), false);
  }
  assert.equal(visibility.isPublicMentorProfile({ mentorStatus: "approved", publicProfileEnabled: false }), false);
});

test("public resource DTO never exposes a protected destination", () => {
  const result = visibility.toPublicResourceDto({
    id: "pack-1",
    status: "published",
    title: "Pack",
    downloadUrl: "https://private.test/root.zip",
    assets: [{ title: "File", downloadUrl: "https://private.test/file.zip" }],
  });
  assert.equal(result.downloadUrl, undefined);
  assert.equal(result.assets[0].downloadUrl, undefined);
  assert.equal(result.assets[0].assetIndex, 0);
});
