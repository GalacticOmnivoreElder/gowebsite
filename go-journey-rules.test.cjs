const fs = require("node:fs");
const { after, before, test } = require("node:test");
const { assertFails, initializeTestEnvironment } = require("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc } = require("firebase/firestore");

let testEnv;
before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-go-platform",
    firestore: { rules: fs.readFileSync(process.env.FIRESTORE_RULES_TEST_PATH || "firestore.rules", "utf8") },
  });
});
after(async () => testEnv?.cleanup());

test("browser clients cannot read or write GO journey and matchmaking collections", async () => {
  const collections = [
    "go_matchmaking_profiles",
    "go_matchmaking_pairs",
    "go_journey_events",
    "go_journey_preferences",
    "go_journey_stats",
    "go_skill_evidence",
    "passport_preferences",
  ];
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(collections.map((collection) => setDoc(doc(db, collection, "private-record"), { userId: "member" })));
  });
  const contexts = [testEnv.unauthenticatedContext(), testEnv.authenticatedContext("member"), testEnv.authenticatedContext("admin", { admin: true })];
  for (const context of contexts) {
    const db = context.firestore();
    for (const collection of collections) {
      const reference = doc(db, collection, "private-record");
      await assertFails(getDoc(reference));
      await assertFails(setDoc(reference, { userId: "member" }));
    }
  }
});
