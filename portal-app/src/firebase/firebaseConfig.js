import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// Analytics isn't available in all environments (e.g. Jest/IndexedDB-less).
if (typeof window !== "undefined" && typeof window.indexedDB !== "undefined") {
  try {
    getAnalytics(app);
  } catch (err) {
    // Best-effort only; don't crash the app.
    console.warn("Firebase analytics not available:", err);
  }
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);


