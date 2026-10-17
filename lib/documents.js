// ════════════════════════════════════════════════════════════════════════════
// Documents de l'accompagnement — modèle serveur (Admin SDK uniquement).
//
// Fiche d'engagement, charte, règlement d'un atelier… Le conseiller dépose un
// document (PDF ou Word, et/ou un texte), partagé avec sa structure, puis
// l'envoie à une personne ou à une promo (envoi de type 'document').
//
// Deux façons de signer, au choix du conseiller pour chaque document :
//   en-ligne  la personne coche « J'ai lu et j'accepte » : on garde son code,
//             la date et la version. Aucun nom n'est demandé (pseudonymat).
//   papier    la personne signe à la main avec son conseiller, qui marque
//             ensuite le document comme signé. Le papier reste à la structure,
//             il ne remonte pas dans l'application.
//
// Structure Firestore : documentsModeles/{id}
//   titre, description, texte, mode ('en-ligne' | 'papier')
//   fichier   { path, name, size, contentType } ou null (bucket privé)
//   version, auteurUid, structureId, archived, createdAt, updatedAt
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { signedUrlFor } from '@/lib/attachments';

const COL = 'documentsModeles';
export const MODES = new Set(['en-ligne', 'papier']);

const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const ms = (ts) => ts?.toMillis?.() ?? null;

function serialize(d, uid) {
  const x = d.data();
  return {
    id: d.id,
    titre: x.titre,
    description: x.description || '',
    texte: x.texte || '',
    mode: x.mode || 'en-ligne',
    fichier: x.fichier ? { name: x.fichier.name, size: x.fichier.size, contentType: x.fichier.contentType } : null,
    version: x.version || 1,
    mine: x.auteurUid === uid,
    updatedAt: ms(x.updatedAt),
  };
}

export async function listDocuments({ conseillerUid, structureId = 'default' }) {
  const snap = await adminDb.collection(COL).where('structureId', '==', structureId).limit(200).get();
  return snap.docs.filter((d) => !d.data().archived).map((d) => serialize(d, conseillerUid))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export async function getDocument(id) {
  if (!id || String(id).includes('/')) return null;
  const snap = await adminDb.doc(`${COL}/${id}`).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

export async function createDocument({ conseillerUid, structureId = 'default', titre, description, texte, mode, fichier }) {
  const t = clip(titre, 160);
  if (!t) throw Object.assign(new Error('Donnez un titre au document.'), { status: 400 });
  const body = clip(texte, 20000);
  if (!fichier && !body) throw Object.assign(new Error('Joignez un fichier ou écrivez le texte du document.'), { status: 400 });
  const ref = adminDb.collection(COL).doc();
  await ref.set({
    titre: t,
    description: clip(description, 600),
    texte: body,
    mode: MODES.has(mode) ? mode : 'en-ligne',
    fichier: fichier || null,
    version: 1,
    auteurUid: conseillerUid,
    structureId,
    archived: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id };
}

// Retire un document de la bibliothèque. Les envois et signatures restent.
export async function archiveDocument({ id, conseillerUid }) {
  const ref = adminDb.doc(`${COL}/${id}`);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Document introuvable.'), { status: 404 });
  if (snap.data().auteurUid !== conseillerUid) throw Object.assign(new Error('Seul son auteur peut retirer ce document.'), { status: 403 });
  await ref.set({ archived: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { ok: true };
}

// Version affichable d'un document : lien de téléchargement signé (1 h).
export async function documentForDisplay(id) {
  const d = await getDocument(id);
  if (!d) return null;
  return {
    id: d.id,
    titre: d.titre,
    description: d.description || '',
    texte: d.texte || '',
    mode: d.mode || 'en-ligne',
    version: d.version || 1,
    fichier: d.fichier ? { name: d.fichier.name, size: d.fichier.size, downloadUrl: await signedUrlFor(d.fichier.path) } : null,
  };
}
