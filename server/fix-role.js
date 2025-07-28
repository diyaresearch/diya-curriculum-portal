const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const userId = 'lWnsvImW8hXwurrcrT895u2d7M72'; // Your user ID

async function fixRole() {
    try {
        console.log('Updating role to teacherPlus...');

        const userRef = db.collection('teachers').doc(userId);
        await userRef.update({
            role: 'teacherPlus',
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Role updated successfully to teacherPlus!');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixRole();
