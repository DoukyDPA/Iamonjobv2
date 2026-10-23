// ════════════════════════════════════════════════════════════════════════════
// Suspension d'une structure (essai sans suite, client qui arrête…).
//
// structures/{id}.suspendue = true coupe l'accès de tous ses conseillers et
// responsables, sans rien effacer. Vérifié à chaque requête conseiller (voir
// lib/session.js), avec une mémoire d'une minute pour ne pas relire Firestore
// à chaque appel. La réactivation rend l'accès tel qu'il était.
// Les administrateurs de la plateforme (ADMIN_EMAILS) ne sont jamais bloqués.
// ════════════════════════════════════════════════════════════════════════════

import { adminDb } from '@/lib/firebase/admin';

const cache = new Map(); // structureId → { suspendue, t }
const TTL = 60 * 1000;

export async function isStructureSuspendue(structureId) {
  const id = structureId || 'default';
  const c = cache.get(id);
  if (c && Date.now() - c.t < TTL) return c.suspendue;
  let suspendue = false;
  try {
    const snap = await adminDb.doc(`structures/${id}`).get();
    suspendue = snap.exists && snap.data().suspendue === true;
  } catch { /* en cas de doute, on ne bloque pas */ }
  cache.set(id, { suspendue, t: Date.now() });
  return suspendue;
}

export function oublierSuspension(structureId) {
  cache.delete(structureId || 'default');
}

export function isAdminEmail(email) {
  const e = String(email || '').trim().toLowerCase();
  return Boolean(e) && String(process.env.ADMIN_EMAILS || '').split(',').map((x) => x.trim().toLowerCase()).includes(e);
}
