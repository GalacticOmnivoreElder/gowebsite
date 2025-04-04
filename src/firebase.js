import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCVDpes70r7L8mRTbr_mCfsACu6eEnFO08",
  authDomain: "go-platform-7960b.firebaseapp.com",
  projectId: "go-platform-7960b",
  // storageBucket: "go-platform-7960b.firebasestorage.app",
  messagingSenderId: "223613173824",
  appId: "1:223613173824:web:93dd769fc3d22877e9dfa5",
  measurementId: "G-9NKX7EKXVS",
};
// const analytics = getAnalytics(app);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
