import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function getCvFromFirestore(userId) {
  try {
    const snap = await getDoc(doc(db, 'cvs', userId));
    if (snap.exists()) return snap.data();
  } catch (err) {
    console.warn('[Firestore] Chargement CV échoué :', err.message);
  }
  return null;
}

export async function saveCvToFirestore(userId, cvText, analysis) {
  try {
    await setDoc(doc(db, 'cvs', userId), {
      cvText,
      analysis,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[Firestore] Sauvegarde CV échouée :', err.message);
  }
}
