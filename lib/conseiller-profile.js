// ════════════════════════════════════════════════════════════════════════════
// Profil conseiller — prénom et photo (Admin SDK uniquement).
//
// La personne accompagnée voit « Mon conseiller : prénom » avec sa photo. Ce
// petit profil humanise le contact. Il vit dans Firestore, une fiche par
// conseiller, la photo dans le bucket privé (lien signé à la lecture).
//
// Structure Firestore : conseillers/{uid}
//   prenom     prénom affiché côté personne accompagnée
//   photoPath  chemin de la photo dans le bucket (null si aucune)
//   role       'conseiller' (annuaire de la structure, pour les transferts)
//   email, structureId, lastSeenAt   tenus à jour à chaque visite de /conseiller
//   updatedAt
//
// Accès client : aucun. Tout passe par /api/conseiller/profile et /api/avis.
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { signedUrlFor } from '@/lib/attachments';

const COL = 'conseillers';
const MAX_PRENOM = 40;

// Profil brut (avec le chemin de la photo, jamais renvoyé tel quel au client).
export async function getConseillerProfile(uid) {
  if (!uid) return { prenom: '', photoPath: null };
  const snap = await adminDb.doc(`${COL}/${uid}`).get();
  if (!snap.exists) return { prenom: '', photoPath: null };
  const d = snap.data();
  return { prenom: d.prenom || '', photoPath: d.photoPath || null };
}

// Profil prêt à afficher : prénom + URL de photo signée (éphémère) ou null.
export async function getConseillerPublicProfile(uid) {
  const p = await getConseillerProfile(uid);
  const photoUrl = p.photoPath ? await signedUrlFor(p.photoPath) : null;
  return { prenom: p.prenom, photoUrl };
}

// Met à jour le prénom (nettoyé et plafonné).
export async function setConseillerPrenom(uid, prenom) {
  const value = String(prenom || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, MAX_PRENOM);
  await adminDb.doc(`${COL}/${uid}`).set(
    { prenom: value, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
  return { prenom: value };
}

// Enregistre le chemin de la nouvelle photo.
export async function setConseillerPhotoPath(uid, photoPath) {
  await adminDb.doc(`${COL}/${uid}`).set(
    { photoPath: photoPath || null, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}

// Inscrit (ou rafraîchit) le conseiller dans l'annuaire de sa structure. Appelé
// à chaque ouverture de l'espace conseiller : un collègue apparaît dans la liste
// des transferts dès sa première visite.
export async function registerConseiller({ uid, email, structureId }) {
  if (!uid) return;
  await adminDb.doc(`${COL}/${uid}`).set({
    role: 'conseiller',
    email: String(email || '').toLowerCase().slice(0, 200) || null,
    structureId: structureId || 'default',
    lastSeenAt: FieldValue.serverTimestamp(),
  }, { merge: true });
}

// Collègues de la même structure (hors soi-même), pour transférer un dossier.
export async function listCollegues({ uid, structureId }) {
  const snap = await adminDb.collection(COL)
    .where('structureId', '==', structureId || 'default')
    .limit(200)
    .get();
  return snap.docs
    .filter((d) => d.id !== uid && d.data().role === 'conseiller')
    .map((d) => ({ uid: d.id, prenom: d.data().prenom || '', email: d.data().email || '' }))
    .sort((a, b) => (a.prenom || a.email).localeCompare(b.prenom || b.email, 'fr'));
}
