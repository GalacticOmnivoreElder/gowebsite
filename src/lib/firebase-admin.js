import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Read env vars
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

// Normalize private key (handle escaped newlines)
if (privateKey && privateKey.includes("\\n")) {
  privateKey = privateKey.replace(/\\n/g, "\n");
}

// Validate
if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Missing Firebase Admin environment variables");
}

const params = {
  credential: cert({
    projectId,
    clientEmail,
    privateKey,
  }),
};

// Initialize once
const app = getApps().length === 0 ? initializeApp(params) : getApps()[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
