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
