import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

/**
 * Initialise Firebase Admin une seule fois (Next.js peut recharger ce module).
 * Retourne false si les clés sont absentes — on évite alors de bloquer le build.
 */
function ensureInit() {
  if (getApps().length) return true;
  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin non initialisé : clés manquantes.');
    return false;
  }
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
  return true;
}

// ─── Auth ─────────────────────────────────────────────────────────────────
export const adminAuth = {
  verifyIdToken: async (token) => {
    if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
    return getAuth().verifyIdToken(token);
  },
};

// ─── Firestore ────────────────────────────────────────────────────────────
export const adminDb = {
  collection: (name) => {
    if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
    return getFirestore().collection(name);
  },
  doc: (path) => {
    if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
    return getFirestore().doc(path);
  },
  runTransaction: (updateFn) => {
    if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
    return getFirestore().runTransaction(updateFn);
  },
};

export { FieldValue };
