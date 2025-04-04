import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import serviceAccount from "./go-platform-7960b-firebase-adminsdk-fbsvc-dfb34e16d3.json";

// Initialize Firebase Admin
const firebaseAdmin =
  getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
        databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
      })
    : getApps()[0];

// Export the admin services
export const adminAuth = getAuth(firebaseAdmin);
export const adminDb = getFirestore(firebaseAdmin);
export default firebaseAdmin;
