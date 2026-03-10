/**
 * seed-admin.js
 * Run once from the project root:
 *   node scripts/seed-admin.js <ADMIN_USER_UID>
 *
 * This script sets the `role: 'admin'` field on the specified Firestore
 * user document so they can access the Admin Dashboard.
 *
 * Prerequisites:
 *   - Firebase Admin SDK service account OR Application Default Credentials
 *   - `npm install firebase-admin` (already in functions/node_modules)
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = 'ex-1-19b23';
const uid = process.argv[2];

if (!uid) {
    console.error('Usage: node scripts/seed-admin.js <USER_UID>');
    console.error('Get your UID from Firebase Console → Authentication → Users');
    process.exit(1);
}

initializeApp({ projectId });
const db = getFirestore();

(async () => {
    try {
        await db.collection('users').doc(uid).set(
            { role: 'admin', setupComplete: true },
            { merge: true }
        );
        console.log(`✅ Admin role set for uid: ${uid}`);
        console.log('   Restart app and log in with this account to access /admin');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
})();
