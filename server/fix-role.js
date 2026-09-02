const admin = require('firebase-admin');
const { PROJECT_ID, resolveCredential } = require('./config/credentials');

// Initialize Firebase Admin using the same credential resolution as the API,
// so this script does not depend on a downloaded key file (issue #418).
if (!admin.apps.length) {
    const resolved = resolveCredential();
    admin.initializeApp({
        credential: resolved.credential,
        projectId: PROJECT_ID
    });
    console.log(`Firebase initialized with ${resolved.detail}`);
}

const db = admin.firestore();
const userId = 'lWnsvImW8hXwurrcrT895u2d7M72'; // Your user ID

async function fixRole() {
    try {
        console.log('Updating role to teacherPlus...');

        const userRef = db.collection('users').doc(userId);
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
