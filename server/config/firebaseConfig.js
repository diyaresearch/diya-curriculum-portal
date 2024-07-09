const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json"); // Adjust path as needed

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "curriculum-portal-1ce8f",
  storageBucket: "curriculum-portal-1ce8f.appspot.com",
});

const db = admin.firestore();
const storage = admin.storage();

module.exports = { admin, db, storage };
