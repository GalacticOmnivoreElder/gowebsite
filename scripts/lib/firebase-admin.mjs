import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function credential() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) return cert(JSON.parse(readFileSync(resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH), "utf8")));
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && (process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY_BASE64)) {
    const raw = process.env.FIREBASE_PRIVATE_KEY_BASE64 ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64, "base64").toString("utf8") : process.env.FIREBASE_PRIVATE_KEY;
    return cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: raw.replace(/\\n/g, "\n") });
  }
  return applicationDefault();
}

const app = getApps()[0] || initializeApp({ credential: credential() });
export const db = getFirestore(app);
