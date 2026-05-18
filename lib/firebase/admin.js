import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

// ── Diagnostic temporaire : log au chargement du module ──
console.log('[firebase-admin] Variables détectées au boot :');
console.log('  FIREBASE_ADMIN_PROJECT_ID   =', projectId ? `"${projectId}"` : '❌ MANQUANT');
console.log('  FIREBASE_ADMIN_CLIENT_EMAIL =', clientEmail ? `"${clientEmail}"` : '❌ MANQUANT');
console.log('  FIREBASE_ADMIN_PRIVATE_KEY  =', privateKey ? `(longueur ${privateKey.length}, début "${privateKey.slice(0,30)}")` : '❌ MANQUANT');
console.log('  Clés FIREBASE_* visibles    =', Object.keys(process.env).filter(k => k.includes('FIREBASE')).join(', '));

// Fonction interne pour s'assurer que Firebase est initialisé avant d'appeler un service
function getAdminAuth() {
  if (!getApps().length) {
    if (projectId && clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
        }),
      });
    } else {
      // Évite de bloquer le build si les variables sont absents à la compilation
      console.warn("Firebase Admin non initialisé : Clés manquantes.");
      return null;
    }
  }
  return getAuth();
}

// On exporte un objet qui imite fidèlement le SDK Firebase Admin original
export const adminAuth = {
  verifyIdToken: async (token) => {
    const auth = getAdminAuth();
    if (!auth) throw new Error("Firebase Admin n'est pas configuré.");
    return auth.verifyIdToken(token);
  }
};
