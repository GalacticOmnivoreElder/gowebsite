// src/lib/firebase-admin.ts
import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Read env vars
const projectId = process.env.FIREBASE_PROJECT_ID as string;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL as string;
let privateKey = process.env.FIREBASE_PRIVATE_KEY as string;

// Validate + normalize
if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Missing Firebase Admin env vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
  );
}

// Remove wrapping quotes if Vercel added them
if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
  privateKey = privateKey.slice(1, -1);
}
// Convert literal `\n` to actual newlines
privateKey = privateKey.replace(/\\n/g, "\n");

// Build cert
const params = {
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
  databaseURL: `https://${projectId}.firebaseio.com`,
};

// Initialize once
const app: App = getApps().length === 0 ? initializeApp(params) : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export default app;
