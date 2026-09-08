const admin = require("firebase-admin");
const {
  PROJECT_ID,
  STORAGE_BUCKET,
  resolveCredential,
  credentialOptions,
} = require("./credentials");

// The one and only admin.initializeApp() in the backend (issue #362).
//
// Everything that touches Firestore or Storage arrives here eventually:
// controllers require { db, storage } directly, services/databaseService
// delegates to this module for its real (non-mock) mode, and
// routes/stripeWebhook reads .db lazily. routes/payment.js and
// routes/stripeWebhook.js each used to call a bare admin.initializeApp() of
// their own, so whichever module loaded first decided the credential for the
// whole process and the precedence in ./credentials could be skipped
// entirely.
//
// Credential selection lives in ./credentials, which is also what
// ../services/databaseService consults to decide real vs mock mode.
let app;
if (!admin.apps.length) {
  let resolved;
  try {
    resolved = resolveCredential();
  } catch (error) {
    console.error("Failed to resolve a Firebase Admin credential:\n" + error.message);
    throw error;
  }

  app = admin.initializeApp({
    ...credentialOptions(resolved),
    projectId: PROJECT_ID,
    storageBucket: STORAGE_BUCKET,
  });
  console.log(`Firebase initialized with ${resolved.detail}`);
} else {
  app = admin.app();
}

const db = admin.firestore();
const storage = admin.storage();

module.exports = { admin, db, storage };
