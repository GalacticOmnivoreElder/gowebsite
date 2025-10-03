// lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Guard + normalize the private key (handles escaped \n from env UIs)
if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
  );
}
// If the platform wraps the key in quotes, strip them
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey.replace(/\\n/g, "\n");

const params = {
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  // Needed only if you use the Realtime Database; harmless otherwise
  databaseURL: `https://${projectId}.firebaseio.com`,
};

const app: App = getApps().length ? getApps()[0] : initializeApp(params);

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export default app;
