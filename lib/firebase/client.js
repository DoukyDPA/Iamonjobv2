import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

// Config Firebase publique du projet iamonjobv2.
// Ces valeurs sont PUBLIQUES par design (visibles dans le bundle JS de toute app web Firebase).
// On les conserve en dur ici pour pallier les caprices d'injection des variables NEXT_PUBLIC_*
// au build sur certains hébergeurs (Railway). Les variables d'env restent prioritaires si présentes.
const FIREBASE_PUBLIC = {
  apiKey:            'AIzaSyB11FwuGhFhIwdvK6bQvxjDJRrHZL57hxQ',
  authDomain:        'iamonjobv2.firebaseapp.com',
  projectId:         'iamonjobv2',
  storageBucket:     'iamonjobv2.firebasestorage.app',
  messagingSenderId: '459967707695',
  appId:             '1:459967707695:web:7daa34e79192df863424da',
};

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || FIREBASE_PUBLIC.apiKey,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || FIREBASE_PUBLIC.authDomain,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || FIREBASE_PUBLIC.projectId,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || FIREBASE_PUBLIC.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID|| FIREBASE_PUBLIC.messagingSenderId,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || FIREBASE_PUBLIC.appId,
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
    // merge: true ⇒ on ne touche pas aux champs non listés (notamment `rating`).
    await setDoc(
      doc(db, 'cvs', userId),
      {
        cvText,
        analysis,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore] Sauvegarde CV échouée :', err.message);
  }
}

/**
 * Sauvegarde uniquement la note du CV (et le texte qui la justifie).
 * Permet à la note de survivre aux rechargements de page tant que le CV ne
 * change pas.
 */
export async function saveCvRatingToFirestore(userId, cvText, rating) {
  try {
    await setDoc(
      doc(db, 'cvs', userId),
      {
        cvText,
        rating,
        ratingUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('[Firestore] Sauvegarde note CV échouée :', err.message);
  }
}

/**
 * Efface la note (CV modifié) sans toucher au reste du document.
 * Échec silencieux si le doc n'existe pas encore — c'est ok.
 */
export async function clearCvRatingInFirestore(userId) {
  try {
    await setDoc(
      doc(db, 'cvs', userId),
      { rating: null, ratingUpdatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch {
    // Silencieux : pas de note à effacer = pas de problème.
  }
}
