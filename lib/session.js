// ════════════════════════════════════════════════════════════════════════════
// Session serveur — lecture du cookie __session et des rôles.
//
// Reprend le schéma déjà en place dans les routes API (cookie __session +
// verifyIdToken), en ajoutant la lecture des custom claims `role` et
// `structureId`. Toute personne sans rôle explicite est un bénéficiaire.
// ════════════════════════════════════════════════════════════════════════════

import { adminAuth } from '@/lib/firebase/admin';

export async function getSession(request) {
  const token = request.cookies.get('__session')?.value;
  if (!token) return { uid: null, error: 'Non authentifié.', status: 401 };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      uid: decoded.uid,
      role: decoded.role || 'beneficiaire',
      structureId: decoded.structureId || null,
    };
  } catch {
    return { uid: null, error: 'Session invalide.', status: 401 };
  }
}

// Garde de rôle : renvoie la session si le rôle correspond, sinon une erreur
// prête à retourner (403). À utiliser en tête des routes réservées.
export async function requireRole(request, role) {
  const session = await getSession(request);
  if (!session.uid) return session;
  if (session.role !== role) {
    return { uid: null, error: 'Accès réservé.', status: 403 };
  }
  return session;
}
