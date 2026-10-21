// ════════════════════════════════════════════════════════════════════════════
// Seuils d'alerte des questionnaires de suivi, réglables par parcours.
//
// Une baisse de 2 points n'a pas le même sens dans tous les parcours : chaque
// structure règle, parcours par parcours, à partir de quelle baisse et de
// quelle note basse une personne passe « en alerte ».
//   parcoursSeuils/{structureId}  { parcours: { [parcoursId]: { baisse, noteBasse } } }
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';

export const SEUILS_DEFAUT = { baisse: 2, noteBasse: 4 };

const clampInt = (v, min, max, def) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

export async function getSeuils(structureId) {
  const snap = await adminDb.doc(`parcoursSeuils/${structureId || 'default'}`).get();
  return snap.exists ? snap.data().parcours || {} : {};
}

export async function setSeuils({ structureId, parcoursId, baisse, noteBasse }) {
  if (!parcoursId) throw Object.assign(new Error('Parcours requis.'), { status: 400 });
  const value = {
    baisse: clampInt(baisse, 1, 10, SEUILS_DEFAUT.baisse),
    noteBasse: clampInt(noteBasse, 0, 10, SEUILS_DEFAUT.noteBasse),
  };
  await adminDb.doc(`parcoursSeuils/${structureId || 'default'}`).set(
    { parcours: { [parcoursId]: value }, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return value;
}
