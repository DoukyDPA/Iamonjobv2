import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Nom du bucket de stockage (mêmes valeurs publiques que côté client).
const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  process.env.FIREBASE_STORAGE_BUCKET ||
  'iamonjobv2.firebasestorage.app';

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
  // Supprime définitivement le compte Auth (droit à l'effacement RGPD).
  deleteUser: async (uid) => {
    if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
    return getAuth().deleteUser(uid);
  },
  // Pose le rôle et la structure sur un compte (custom claims). Ces valeurs
  // remontent ensuite dans le token vérifié par verifyIdToken.
  setCustomUserClaims: async (uid, claims) => {
    if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
    return getAuth().setCustomUserClaims(uid, claims);
  },
  // Lecture d'un compte par email (utilisé pour promouvoir un conseiller).
  getUserByEmail: async (email) => {
    if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
    return getAuth().getUserByEmail(email);
  },
  // Lecture d'un compte par UID (ex. retrouver l'email d'un conseiller à notifier).
  getUser: async (uid) => {
    if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
    return getAuth().getUser(uid);
  },
  // Crée un compte email/mot de passe (activation d'un bénéficiaire par code).
  createUser: async ({ email, password }) => {
    if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
    return getAuth().createUser({ email, password });
  },
  // Parcourt les comptes Auth par page (1000 max). Sert à la purge des comptes
  // inactifs : on lit les custom claims (pour écarter les conseillers) et les
  // métadonnées d'activité (dernière connexion, dernier rafraîchissement).
  listUsers: async (maxResults = 1000, pageToken) => {
    if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
    return getAuth().listUsers(maxResults, pageToken);
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
  // Lecture groupée de plusieurs documents en un seul aller-retour.
  getAll: (...refs) => {
    if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
    return getFirestore().getAll(...refs);
  },
};

// ─── Storage ────────────────────────────────────────────────────────────────
// Accès au bucket via l'Admin SDK (contourne les règles). Tout passe par le
// serveur : le bucket reste fermé côté client, l'accès se fait par liens signés.
export const adminBucket = () => {
  if (!ensureInit()) throw new Error("Firebase Admin n'est pas configuré.");
  return getStorage().bucket(STORAGE_BUCKET);
};

export { FieldValue };
