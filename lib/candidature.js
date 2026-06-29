// ════════════════════════════════════════════════════════════════════════════
// Candidatures France Travail — CRUD Firestore.
//
// Structure Firestore : candidatures/{candidatureId}
//   uid, type ('france_travail'), status, offer, compatibility,
//   coverLetter, interviewPrep, createdAt, updatedAt.
//
// Statuts :
//   'saved'     → analysée, sauvegardée
//   'applying'  → en cours de candidature
//   'sent'      → candidature envoyée
//   'rejected'  → refus reçu
//   'interview' → entretien obtenu
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';

const COL = 'candidatures';

export async function createCandidature({ uid, offer, compatibility }) {
  const now = FieldValue.serverTimestamp();
  const doc = {
    uid,
    type: 'france_travail',
    status: 'saved',
    offer: {
      id:          offer.id          ?? null,
      intitule:    offer.intitule    ?? '',
      entreprise:  offer.entreprise  ?? '',
      lieu:        offer.lieu        ?? '',
      typeContrat: offer.typeContrat ?? '',
      url:         offer.url         ?? null,
    },
    compatibility: {
      score:        compatibility.score        ?? null,
      forces:       compatibility.forces       ?? [],
      faiblesses:   compatibility.faiblesses   ?? [],
      conseilGlobal: compatibility.conseilGlobal ?? '',
    },
    coverLetter:   null,
    interviewPrep: null,
    createdAt: now,
    updatedAt: now,
  };
  const ref = await adminDb.collection(COL).add(doc);
  return { candidatureId: ref.id };
}

export async function getCandidatures(uid) {
  const snap = await adminDb
    .collection(COL)
    .where('uid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getCandidatureById(candidatureId, uid) {
  const doc = await adminDb.doc(`${COL}/${candidatureId}`).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.uid !== uid) return null;
  return { id: doc.id, ...data };
}

export async function updateCandidature(candidatureId, updates) {
  await adminDb.doc(`${COL}/${candidatureId}`).set(
    { ...updates, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

export async function deleteCandidature(candidatureId) {
  await adminDb.doc(`${COL}/${candidatureId}`).delete();
}
