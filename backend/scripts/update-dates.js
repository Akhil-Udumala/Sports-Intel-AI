import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";
import dotenv from "dotenv";

dotenv.config();

const firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    const snap = await getDocs(collection(db, "coaches"));
    const now = new Date("2026-03-09T09:24:00Z");
    const promises = [];
    snap.forEach(d => {
        let data = d.data();
        let update = {};
        if (!data.joinedAt) update.joinedAt = now;
        if (!data.lastLogin) update.lastLogin = now;
        if (Object.keys(update).length > 0) {
            promises.push(setDoc(d.ref, update, { merge: true }));
        }
    });
    await Promise.all(promises);
    console.log("Updated", promises.length, "coaches.");
    process.exit(0);
}
run().catch(console.error);
