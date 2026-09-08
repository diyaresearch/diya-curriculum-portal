/**
 * The browser half of this app's Firebase setup, and the only place that
 * calls initializeApp() (issue #362).
 *
 * Two SDKs, two configs, no overlap — that separation is the point of the
 * issue and worth keeping straight:
 *
 *   this file          firebase (client SDK), configured from VITE_FIREBASE_*
 *                      values that ship inside the bundle. They are public
 *                      identifiers, not secrets; Firestore rules and the
 *                      backend's token checks are what protect data.
 *   functions/config/  firebase-admin, configured from a Google Cloud
 *                      credential. See functions/CREDENTIALS.md.
 *
 * Import the instances below rather than calling getAuth()/getFirestore()/
 * getStorage() again. Those accessors return this same default app, so the
 * old scattered calls were not wrong so much as fragile: a module that
 * called getFirestore() without importing this file worked only because
 * something else had imported it first, and the emulator wiring at the
 * bottom applies to instances obtained here.
 */

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Analytics only. Absent in the staging project, so it is not required.
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Every key the SDK needs to reach a project at all. Left unchecked, a
// missing one surfaces much later as `auth/invalid-api-key` on the sign-in
// button or an empty page where Firestore data should be, with nothing
// naming the actual cause.
// `satisfies` rather than a bare array: every entry must be a real key of
// firebaseConfig, so renaming a config field breaks this list at build time
// instead of silently dropping it from the check.
const REQUIRED_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
] as const satisfies readonly (keyof typeof firebaseConfig)[];

const missing = REQUIRED_KEYS.filter((key) => !firebaseConfig[key]);
if (missing.length > 0) {
  const names = missing
    .map((key) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`)
    .join(", ");
  const message =
    `Firebase is not configured: missing ${names}.\n` +
    "Copy portal-app/.env.example to portal-app/.env.development and fill in the " +
    "values from Firebase Console -> Project Settings -> Your apps.";

  // Tests run without a .env file and mock this module where they need it;
  // failing their import would say nothing useful about the test.
  if (import.meta.env.MODE === "test") {
    console.warn(message);
  } else {
    throw new Error(message);
  }
}

export const app = initializeApp(firebaseConfig);
// Analytics isn't available in all environments (e.g. Vitest/IndexedDB-less).
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

// Opt-in local dev against the Firebase emulator suite (#428), off by
// default so this never affects a real dev/prod build. Set in
// portal-app/.env.development.local (gitignored) alongside
// `firebase emulators:start` / `./start.sh --emulator`.
if (import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true") {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
  console.log("🔧 Connected to Firebase Auth + Firestore emulators");
}
