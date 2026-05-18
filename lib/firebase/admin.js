import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!getApps().length) {
  // On vérifie qu'on dispose bien des clés avant d'initialiser
  // Évite de faire planter le "next build" si les variables sont absentes à la compilation
  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({
        projectId: projectId,
        clientEmail: clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  } else {
    console.warn("Firebase Admin non initialisé : Variables d'environnement manquantes (normal pendant le build).");
  }
}

// Export d'une fonction ou d'un getter pour récupérer l'Auth à la volée au runtime
export const adminAuth = {
  verifyIdToken: async (token) => {
    if (!getApps().length) {
      throw new Error("Firebase Admin n'a pas été correctement initialisé.");
    }
    return getAuth().verifyIdToken(token);
  }
};
