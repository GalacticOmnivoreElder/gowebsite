/**
 * Run: node --env-file=.env scripts/test-firestore-admin.mjs
 * Or set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON path.
 */
const { initializeApp, getApps, cert, applicationDefault } = await import(
  "firebase-admin/app"
);
const { getFirestore } = await import("firebase-admin/firestore");

function credential() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.log("Using GOOGLE_APPLICATION_CREDENTIALS");
    return applicationDefault();
  }
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey?.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  console.log("Using FIREBASE_* env vars", {
    projectId: projectId || "missing",
    clientEmail: clientEmail || "missing",
    keyOk:
      !!privateKey?.includes("BEGIN PRIVATE KEY") &&
      privateKey?.includes("END PRIVATE KEY"),
  });
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_* or GOOGLE_APPLICATION_CREDENTIALS");
  }
  return cert({ projectId, clientEmail, privateKey });
}

const projectId =
  process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

const app =
  getApps().length === 0
    ? initializeApp({
        credential: credential(),
        ...(projectId ? { projectId } : {}),
      })
    : getApps()[0];

const db = getFirestore(app);
try {
  await db.collection("users").limit(1).get();
  console.log("Firestore: OK (list/read works)");
} catch (e) {
  console.error("Firestore error:", e.code, e.message);
  process.exit(1);
}
