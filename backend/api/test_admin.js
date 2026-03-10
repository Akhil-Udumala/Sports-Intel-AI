const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

async function check() {
    try {
        initializeApp({ projectId: 'ex-1-19b23' });
        const db = getFirestore();
        const snap = await db.collection('coaches').get();
        console.log('Success! Found docs:', snap.size);
        snap.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
        });
    } catch (e) {
        console.error('Failure:', e.message);
    }
}
check();
