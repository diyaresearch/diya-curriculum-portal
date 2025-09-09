const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
let app;
if (!admin.apps.length) {
  try {
    // First, try to use service account key if it exists
    try {
      const serviceAccount = require("../serviceAccountKey.json");
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: "curriculum-portal-1ce8f",
        storageBucket: "curriculum-portal-1ce8f.appspot.com",
      });
      console.log("Firebase initialized with service account key");
    } catch (keyError) {
      // If service account key doesn't exist, use application default credentials
      app = admin.initializeApp({
        projectId: "curriculum-portal-1ce8f",
        storageBucket: "curriculum-portal-1ce8f.appspot.com",
      });
      console.log("Firebase initialized with application default credentials");
    }
  } catch (error) {
    console.error("Failed to initialize Firebase:", error.message);
    throw new Error("Firebase initialization failed. Please check your credentials.");
  }
} else {
  app = admin.app();
}

const db = admin.firestore();
const storage = admin.storage();

module.exports = { admin, db, storage };
