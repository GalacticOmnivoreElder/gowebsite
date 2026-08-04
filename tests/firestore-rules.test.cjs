const fs = require("node:fs");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require("@firebase/rules-unit-testing");
const {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} = require("firebase/firestore");
const { after, before, beforeEach, test } = require("node:test");

const projectId = "demo-go-platform";
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: {
      rules: fs.readFileSync("firestore.rules", "utf8"),
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all([
      setDoc(doc(db, "users", "owner"), {
        activeMember: true,
        bio: "Owner",
      }),
      setDoc(doc(db, "users", "member"), { bio: "Member" }),
      setDoc(doc(db, "projects", "project-1"), {
        ownerUid: "owner",
        status: "approved",
      }),
      setDoc(doc(db, "sourceProjects", "source-1"), {
        ownerUid: "owner",
      }),
      setDoc(doc(db, "applications", "application-1"), {
        applicantUid: "member",
        projectId: "project-1",
      }),
      setDoc(doc(db, "orders", "order-1"), { userId: "member" }),
      setDoc(doc(db, "subscription_events", "event-1"), {
        userId: "member",
      }),
      setDoc(doc(db, "processed_webhooks", "webhook-1"), {
        status: "processed",
      }),
      setDoc(doc(db, "go_cvs", "member"), { user_id: "member" }),
      setDoc(doc(db, "user_profiles", "member"), {
        user_id: "member",
      }),
      setDoc(doc(db, "packages", "published"), { status: "published" }),
      setDoc(doc(db, "packages", "legacy"), { status: "legacy" }),
      setDoc(doc(db, "packages", "missing-status"), { title: "Private" }),
      setDoc(doc(db, "packages", "draft"), { status: "draft" }),
      setDoc(doc(db, "subscriptions", "subscription-1"), {
        userId: "member",
      }),
      setDoc(doc(db, "site_settings", "product"), { mentorApplicationsOpen: false }),
      setDoc(doc(db, "protected_link_tickets", "ticket-1"), { userId: "member" }),
      setDoc(doc(db, "learning_items", "learning-1"), { status: "enrollment_open" }),
      setDoc(doc(db, "learning_enrollments", "enrollment-1"), { userId: "member" }),
      setDoc(doc(db, "product_notifications", "notification-1"), { recipientUserId: "member" }),
      setDoc(doc(db, "video_bundles", "bundle-1"), { status: "published" }),
      setDoc(doc(db, "video_bundle_progress", "progress-1"), { userId: "member" }),
      setDoc(doc(db, "training_assignments", "assignment-1"), { userId: "member" }),
      setDoc(doc(db, "mentor_profiles", "member"), { userId: "member", displayName: "Mentor" }),
      setDoc(doc(db, "mentor_availability", "member"), { userId: "member", timeZone: "Europe/Skopje" }),
      setDoc(doc(db, "mentorship_requests", "request-1"), { studentId: "member" }),
      setDoc(doc(db, "mentorship_active_requests", "member"), { requestId: "request-1" }),
      setDoc(doc(db, "mentorship_request_overrides", "member"), { remaining: 1 }),
      setDoc(doc(db, "mentorship_engagements", "engagement-1"), { studentId: "member", mentorId: "owner" }),
      setDoc(doc(db, "mentorship_active_engagements", "member"), { engagementId: "engagement-1" }),
      setDoc(doc(db, "mentorship_concerns", "concern-1"), { reporterId: "member" }),
      setDoc(doc(db, "mentorship_feedback", "feedback-1"), { authorId: "member", recipientId: "owner" }),
      setDoc(doc(db, "mentorship_feedback_audit", "feedback-audit-1"), { feedbackId: "feedback-1" }),
      setDoc(doc(db, "asset_packs", "pack-1"), { contributorId: "member" }),
      setDoc(doc(db, "asset_pack_versions", "version-1"), { contributorId: "member" }),
      setDoc(doc(db, "asset_pack_grants", "grant-1"), { userId: "member" }),
    ]);
  });
});

after(async () => {
  await testEnv?.cleanup();
});

function dbFor(uid, claims = {}) {
  return uid
    ? testEnv.authenticatedContext(uid, claims).firestore()
    : testEnv.unauthenticatedContext().firestore();
}

test("anonymous visitors cannot bypass sanitized resource APIs", async () => {
  const db = dbFor(null);
  await assertFails(getDoc(doc(db, "packages", "published")));
  await assertFails(getDoc(doc(db, "packages", "legacy")));
  await assertFails(getDoc(doc(db, "packages", "draft")));
  await assertFails(getDoc(doc(db, "packages", "missing-status")));
  await assertFails(getDoc(doc(db, "projects", "project-1")));
  await assertFails(getDoc(doc(db, "users", "member")));
});

test("members can manage safe fields on their own user document only", async () => {
  const db = dbFor("member");
  await assertSucceeds(getDoc(doc(db, "users", "member")));
  await assertSucceeds(updateDoc(doc(db, "users", "member"), { bio: "Updated" }));
  await assertFails(
    updateDoc(doc(db, "users", "member"), { activeMember: true })
  );
  await assertFails(getDoc(doc(db, "users", "owner")));
  await assertFails(deleteDoc(doc(db, "users", "member")));
});

const serverOnlyDocuments = [
  ["projects", "project-1"],
  ["sourceProjects", "source-1"],
  ["applications", "application-1"],
  ["orders", "order-1"],
  ["subscription_events", "event-1"],
  ["processed_webhooks", "webhook-1"],
  ["go_cvs", "member"],
  ["user_profiles", "member"],
  ["site_settings", "product"],
  ["protected_link_tickets", "ticket-1"],
  ["learning_items", "learning-1"],
  ["learning_enrollments", "enrollment-1"],
  ["product_notifications", "notification-1"],
  ["video_bundles", "bundle-1"],
  ["video_bundle_progress", "progress-1"],
  ["training_assignments", "assignment-1"],
  ["mentor_profiles", "member"],
  ["mentor_availability", "member"],
  ["mentorship_requests", "request-1"],
  ["mentorship_active_requests", "member"],
  ["mentorship_request_overrides", "member"],
  ["mentorship_engagements", "engagement-1"],
  ["mentorship_active_engagements", "member"],
  ["mentorship_concerns", "concern-1"],
  ["mentorship_feedback", "feedback-1"],
  ["mentorship_feedback_audit", "feedback-audit-1"],
  ["asset_packs", "pack-1"],
  ["asset_pack_versions", "version-1"],
  ["asset_pack_grants", "grant-1"],
];

test("project owners cannot bypass server authorization from the browser", async () => {
  const db = dbFor("owner");
  for (const path of serverOnlyDocuments) {
    const reference = doc(db, ...path);
    await assertFails(getDoc(reference));
    await assertFails(setDoc(reference, { ownerUid: "owner" }, { merge: true }));
  }
});

test("platform admins also use server APIs for sensitive collections", async () => {
  const db = dbFor("admin", { admin: true });
  await assertSucceeds(getDoc(doc(db, "users", "member")));
  await assertSucceeds(
    updateDoc(doc(db, "users", "member"), { activeMember: true })
  );
  await assertSucceeds(getDoc(doc(db, "packages", "published")));
  for (const path of serverOnlyDocuments) {
    await assertFails(getDoc(doc(db, ...path)));
  }
});

test("subscription documents are readable by the subject and admins, never writable by members", async () => {
  await assertSucceeds(
    getDoc(doc(dbFor("member"), "subscriptions", "subscription-1"))
  );
  await assertFails(
    getDoc(doc(dbFor("owner"), "subscriptions", "subscription-1"))
  );
  await assertFails(
    updateDoc(doc(dbFor("member"), "subscriptions", "subscription-1"), {
      status: "active",
    })
  );
  await assertSucceeds(
    getDoc(
      doc(
        dbFor("admin", { admin: true }),
        "subscriptions",
        "subscription-1"
      )
    )
  );
});
