// import { initializeApp, getApps, cert } from "firebase-admin/app";
// import { getAuth } from "firebase-admin/auth";
// import { getFirestore } from "firebase-admin/firestore";
// import serviceAccount from "./go-platform-7960b-firebase-adminsdk-fbsvc-dfb34e16d3.json";

// // Initialize Firebase Admin
// const firebaseAdmin =
//   getApps().length === 0
//     ? initializeApp({
//         credential: cert(serviceAccount),
//         databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
//       })
//     : getApps()[0];
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
}

// Export the initialized services
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
export default admin.app();

// // Export the admin services
// export const adminAuth = getAuth(firebaseAdmin);
// export const adminDb = getFirestore(firebaseAdmin);
// export default firebaseAdmin;
