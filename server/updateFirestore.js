const admin = require('firebase-admin');
const { db } = require("./config/firebaseConfig");

// Define the collections
const SCHEMA_QUALIFIER = `${process.env.DATABASE_SCHEMA_QUALIFIER}`;
const TABLE_COUNTERS =  SCHEMA_QUALIFIER + "counters"; 
const TABLE_CONTENT = SCHEMA_QUALIFIER + "content";

console.log('updateFirestore tables are', TABLE_CONTENT, TABLE_COUNTERS)

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://curriculum-portal-1ce8f.firebaseio.com'
  });
}

async function getNextUnitID() {
  const counterRef = db.collection(TABLE_COUNTERS).doc("unitIdCounter");

  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    if (!counterDoc.exists) {
      throw new Error("Counter document does not exist");
    }

    const lastNumber = counterDoc.data().lastNumber;
    const newNumber = lastNumber + 1;
    transaction.update(counterRef, { lastNumber: newNumber });
    return `diya${newNumber}`;
  });
}

async function updateDocuments() {
  const contentRef = db.collection(TABLE_CONTENT)
  const snapshot = await contentRef.get();

  const batch = db.batch();

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const updates = {};

    // Update UnitID if it doesn't exist
    if (!data.UnitID) {
      const newUnitID = await getNextUnitID();
      updates.UnitID = newUnitID;
    }

    // Update Author if it doesn't exist
    if (!data.Author) {
      updates.Author = 'unknown'; // or any default value you prefer
    }

    // Update LastModified if it doesn't exist
    if (!data.LastModified) {
      updates.LastModified = new Date().toISOString();
    }

    if (Object.keys(updates).length > 0) {
      batch.update(doc.ref, updates);
    }
  }

  await batch.commit();
  console.log('Documents updated successfully.');
}

updateDocuments().catch(console.error);
