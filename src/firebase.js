import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfigString = import.meta.env.VITE_FIREBASE_CONFIG;

let firebaseConfig = {};
try {
    firebaseConfig = JSON.parse(firebaseConfigString);
} catch (e) {
    console.error("Could not parse Firebase config:", e);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { auth, db, storage };
