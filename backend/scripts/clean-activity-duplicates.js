/**
 * clean-activity-duplicates.js
 * Deletes duplicate documents from the `coach_activity` Firestore collection.
 * Keeps the FIRST occurrence of each (coachId + action + description) group,
 * deleting all later duplicates (same content written within the same second).
 *
 * Run: node scripts/clean-activity-duplicates.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function cleanDuplicates() {
    console.log('📋 Fetching coach_activity documents...');

    const snap = await db
        .collection('coach_activity')
        .orderBy('timestamp', 'asc')
        .get();

    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    console.log(`   Found ${docs.length} total entries`);

    // Build a dedup key: coachId + action + description (or stringified meta)
    const seen = new Set();
    const toDelete = [];

    for (const doc of docs) {
        const key = [
            doc.coachId || '',
            doc.action || '',
            doc.description || JSON.stringify(doc.meta || {}),
        ].join('|');

        if (seen.has(key)) {
            toDelete.push(doc.id);
        } else {
            seen.add(key);
        }
    }

    if (toDelete.length === 0) {
        console.log('✅ No duplicates found. Nothing to delete.');
        process.exit(0);
    }

    console.log(`🗑  Deleting ${toDelete.length} duplicate(s)...`);

    // Delete in batches of 400 (Firestore limit is 500)
    const batchSize = 400;
    for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = db.batch();
        toDelete.slice(i, i + batchSize).forEach(id => {
            batch.delete(db.collection('coach_activity').doc(id));
        });
        await batch.commit();
        console.log(`   Deleted batch ${Math.floor(i / batchSize) + 1}`);
    }

    console.log(`✅ Done! Removed ${toDelete.length} duplicate document(s).`);
    process.exit(0);
}

cleanDuplicates().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
