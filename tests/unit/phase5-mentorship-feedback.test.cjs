const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const { test } = require("node:test");
const { loadSourceModule } = require("../helpers/load-source-module.cjs");

const feedback = loadSourceModule(
  "src/lib/mentorship-feedback.js",
  ["cleanMentorshipFeedback", "feedbackDeadline", "getFeedbackEligibility", "mentorshipFeedbackId", "serializeMentorshipFeedback", "toPublicMentorReference"],
  { stripImports: true, sandbox: { crypto } }
);

const completedAt = new Date("2026-08-01T10:00:00.000Z");

test("Phase 5 feedback opens only after completion for fourteen days and has deterministic duplicate protection", () => {
  assert.equal(feedback.getFeedbackEligibility({ status: "active" }, new Date("2026-08-02T00:00:00Z")).reason, "engagement_not_completed");
  assert.equal(feedback.feedbackDeadline(completedAt).toISOString(), "2026-08-15T10:00:00.000Z");
  assert.equal(feedback.getFeedbackEligibility({ status: "completed", completedAt }, new Date("2026-08-10T00:00:00Z")).eligible, true);
  assert.equal(feedback.getFeedbackEligibility({ status: "completed", completedAt }, new Date("2026-08-16T00:00:00Z")).reason, "feedback_window_closed");
  assert.equal(feedback.mentorshipFeedbackId("engagement", "student"), feedback.mentorshipFeedbackId("engagement", "student"));
  assert.notEqual(feedback.mentorshipFeedbackId("engagement", "student"), feedback.mentorshipFeedbackId("engagement", "mentor"));
});

test("direct reviews use demonstrated qualities without scores and validate separate public consent", () => {
  const clean = feedback.cleanMentorshipFeedback({ qualities: ["clarity", "clarity", "unknown"], privateWrittenFeedback: "Private context", publicSharingConsent: false, publicReferenceText: "must disappear" }, "student_to_mentor");
  assert.deepEqual(Array.from(clean.qualities), ["clarity"]);
  assert.equal(clean.publicReferenceText, "");
  assert.doesNotMatch(JSON.stringify(clean), /score|stars|rating|rank/i);
  assert.throws(() => feedback.cleanMentorshipFeedback({ qualities: ["clarity"], publicSharingConsent: true, publicReferenceText: "too short" }, "student_to_mentor"), /minimum|at least/i);
  assert.equal(feedback.cleanMentorshipFeedback({ qualities: ["preparation"], publicSharingConsent: true, publicReferenceText: "This must never become a public student review." }, "mentor_to_student").publicSharingConsent, false);
});

test("student private feedback never reaches the mentor while mentor feedback may reach the student", () => {
  const studentReview = { engagementId: "e", studentId: "student", mentorId: "mentor", authorId: "student", recipientId: "mentor", direction: "student_to_mentor", qualities: ["clarity"], privateWrittenFeedback: "admin-only context", publicSharingConsent: true, publicReferenceText: "A carefully authored public mentor reference.", moderationStatus: "approved" };
  const mentorView = feedback.serializeMentorshipFeedback("f", studentReview, { viewerId: "mentor" });
  assert.equal(mentorView.privateWrittenFeedback, undefined);
  assert.equal(mentorView.publicReferenceText, studentReview.publicReferenceText);
  assert.equal(feedback.serializeMentorshipFeedback("f", studentReview, { viewerId: "student" }).privateWrittenFeedback, "admin-only context");
  const mentorReview = { ...studentReview, authorId: "mentor", recipientId: "student", direction: "mentor_to_student", privateWrittenFeedback: "Student development notes", publicSharingConsent: false, publicReferenceText: "" };
  assert.equal(feedback.serializeMentorshipFeedback("m", mentorReview, { viewerId: "student" }).privateWrittenFeedback, "Student development notes");
});

test("public mentor references require consent, approval, and mentor selection and expose no identity", () => {
  const candidate = { studentId: "secret-student", authorId: "secret-student", recipientId: "mentor", mentorId: "mentor", direction: "student_to_mentor", qualities: ["clarity"], privateWrittenFeedback: "private", publicSharingConsent: true, publicReferenceText: "A useful and respectful direct mentor reference.", moderationStatus: "approved", mentorShowcase: true, reportStatus: "none", correctionStatus: "none", updatedAt: completedAt };
  const publicReference = feedback.toPublicMentorReference(candidate);
  assert.equal(publicReference.attribution, "Verified mentorship participant");
  assert.doesNotMatch(JSON.stringify(publicReference), /secret-student|private|authorId|recipientId/);
  for (const override of [{ publicSharingConsent: false }, { moderationStatus: "pending" }, { mentorShowcase: false }, { reportStatus: "reported" }, { correctionStatus: "requested" }]) {
    assert.equal(feedback.toPublicMentorReference({ ...candidate, ...override }), null);
  }
});

test("Phase 5 routes, moderation, rules, UI, and public projections keep all gates explicit", async () => {
  const route = loadSourceModule("src/app/api/mentorship/feedback/route.js", ["POST"], { stripImports: true, sandbox: { Response, getProductConfig: () => ({ featureFlags: { mentorFeedback: false } }), submitMentorshipFeedback: async () => { throw new Error("must not submit"); } } });
  assert.equal((await route.POST({})).status, 503);
  const service = fs.readFileSync("src/lib/mentorship-feedback-service.js", "utf8");
  const admin = fs.readFileSync("src/app/api/admin/mentorships/route.js", "utf8");
  const panel = fs.readFileSync("src/components/mentors/MentorshipFeedbackPanel.jsx", "utf8");
  const mentorRoute = fs.readFileSync("src/app/api/mentors/[mentorId]/route.js", "utf8");
  const userRoute = fs.readFileSync("src/app/api/user/[id]/route.js", "utf8");
  const rules = fs.readFileSync("firestore.rules", "utf8");
  assert.match(service, /getFeedbackEligibility/);
  assert.match(service, /existingFeedback\.exists/);
  assert.match(service, /transaction\.create\(auditRef/);
  assert.match(service, /set_public_consent|set_showcase|request_correction|report/);
  assert.match(admin, /moderate_feedback|feedbackAudit/);
  assert.match(panel, /fieldset|Demonstrated qualities|No stars, score, ranking, or automatic aggregate/);
  assert.match(panel, /author-consented|revoke consent|Request correction \/ appeal/);
  assert.match(mentorRoute, /publicMentorStrengths/);
  assert.match(mentorRoute, /referencesEnabled \? "no-store"/);
  assert.match(userRoute, /publicMentorStrengths/);
  assert.match(userRoute, /force-dynamic|Cache-Control.*no-store/);
  assert.match(rules, /match \/mentorship_feedback\/\{doc\}\s+\{ allow read, write: if false; \}/);
  assert.match(rules, /match \/mentorship_feedback_audit\/\{doc\}\s+\{ allow read, write: if false; \}/);
});

test("Phase 5 homepage, Privacy Policy, and documentation describe the live model without a threshold", () => {
  const homepage = fs.readFileSync("src/app/(main)/page.js", "utf8");
  const membership = fs.readFileSync("src/app/membership/page.js", "utf8");
  const privacy = fs.readFileSync("src/app/privacy/page.js", "utf8");
  const docs = fs.readFileSync("docs/go-product-placeholders.md", "utf8");
  assert.match(homepage, /private direct reviews and optional author-consented mentor references/i);
  assert.doesNotMatch(membership, /How mentor references protect participants/i);
  assert.match(privacy, /There are no stars, rankings, numeric scores, or\s+automatic aggregates/i);
  assert.match(privacy, /Consent can be revoked/i);
  assert.match(docs, /MENTOR_PUBLIC_REVIEW_THRESHOLD.*Superseded/s);
  assert.match(docs, /not read by application code/i);
});
