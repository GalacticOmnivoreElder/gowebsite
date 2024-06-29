import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBfmrJvv7x0qyNGmBX_ettcChui17Wzoqw",
  authDomain: "pansynergy-9c36a.firebaseapp.com",
  projectId: "pansynergy-9c36a",
  storageBucket: "pansynergy-9c36a.appspot.com",
  messagingSenderId: "653250673549",
  appId: "1:653250673549:web:4948fa2ee76fc1d5909bc4",
  measurementId: "G-2GBF26YFKD",
};

// const analytics = getAnalytics(app);

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, app, db };
