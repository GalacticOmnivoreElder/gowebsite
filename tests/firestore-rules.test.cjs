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
      setDoc(doc(db, "packages", "draft"), { status: "draft" }),
      setDoc(doc(db, "subscriptions", "subscription-1"), {
        userId: "member",
      }),
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

test("anonymous visitors can only read explicitly published packages", async () => {
  const db = dbFor(null);
  await assertSucceeds(getDoc(doc(db, "packages", "published")));
  await assertFails(getDoc(doc(db, "packages", "draft")));
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
