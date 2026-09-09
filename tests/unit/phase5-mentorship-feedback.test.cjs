const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const feedback = loadSourceModule("src/lib/mentorship-feedback.js", ["cleanMentorshipFeedback", "feedbackDeadline", "getFeedbackEligibility", "mentorshipFeedbackId", "serializeMentorshipFeedback", "toPublicMentorReference"], { stripImports: true, sandbox: { crypto } });
const completedAt = new Date("2026-08-01T10:00:00.000Z");

test("feedback opens only after completion and uses deterministic duplicate protection", () => {
  assert.equal(feedback.getFeedbackEligibility({ status: "active" }, new Date("2026-08-02T00:00:00Z")).reason, "engagement_not_completed");
  assert.equal(feedback.feedbackDeadline(completedAt).toISOString(), "2026-08-15T10:00:00.000Z");
  assert.equal(feedback.getFeedbackEligibility({ status: "completed", completedAt }, new Date("2026-08-10T00:00:00Z")).eligible, true);
  assert.equal(feedback.mentorshipFeedbackId("engagement", "member"), feedback.mentorshipFeedbackId("engagement", "member"));
});

test("private direct feedback stays restricted and public references require explicit approval", () => {
  const review = { menteeUserId: "secret-member", authorId: "secret-member", recipientId: "mentor", mentorId: "mentor", direction: "student_to_mentor", qualities: ["clarity"], privateWrittenFeedback: "private", publicSharingConsent: true, publicReferenceText: "A useful and respectful direct mentor reference.", moderationStatus: "approved", mentorShowcase: true, reportStatus: "none", correctionStatus: "none", updatedAt: completedAt };
  assert.equal(feedback.serializeMentorshipFeedback("f", review, { viewerId: "mentor" }).privateWrittenFeedback, undefined);
  const publicReference = feedback.toPublicMentorReference(review);
  assert.equal(publicReference.attribution, "Verified mentorship participant");
  assert.doesNotMatch(JSON.stringify(publicReference), /secret-member|private/);
});

test("current feedback and safety routes are bound to canonical engagements", () => {
  const feedbackRoute = fs.readFileSync("src/app/api/mentorship/engagements/[engagementId]/feedback/route.js", "utf8");
  const reportRoute = fs.readFileSync("src/app/api/mentorship/engagements/[engagementId]/report/route.js", "utf8");
  const service = fs.readFileSync("src/lib/mentorship-service.js", "utf8");
  assert.match(feedbackRoute, /submitMentorshipClosingFeedback/);
  assert.match(reportRoute, /submitMentorshipReport/);
  assert.match(service, /mentorship_closing_feedback/);
  assert.match(service, /mentorship_reports/);
});
