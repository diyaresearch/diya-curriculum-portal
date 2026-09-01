const admin = require("firebase-admin");
const {
  PROJECT_ID,
  STORAGE_BUCKET,
  resolveCredential,
  credentialOptions,
} = require("./credentials");

// Initialize Firebase Admin SDK.
//
// Credential selection lives in ./credentials so this module and
// ../services/databaseService always agree on which identity is in use.
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
