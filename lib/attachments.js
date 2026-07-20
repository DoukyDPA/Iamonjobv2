// ════════════════════════════════════════════════════════════════════════════
// Pièces jointes des échanges conseiller — stockage privé + liens signés.
//
// Le fichier est envoyé au serveur, qui l'écrit dans un bucket fermé via l'Admin
// SDK. On ne stocke jamais d'URL publique : à chaque lecture, on génère un lien
// signé de courte durée. Le client ne touche jamais au bucket directement.
//
// Métadonnée conservée dans le contexte de l'avis :
//   { path, name, size, contentType }
// enrichie à la lecture par un champ éphémère `downloadUrl`.
// ════════════════════════════════════════════════════════════════════════════

import { adminBucket } from '@/lib/firebase/admin';

// Types acceptés : PDF, images courantes, Word. Volontairement restreint.
export const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024; // 5 Mo

const EXT = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

// Nettoie un nom de fichier pour l'affichage (on ne s'en sert pas comme chemin).
function safeName(name) {
  return String(name || 'piece-jointe')
    .replace(/[\r\n\t]/g, ' ')
    .slice(0, 160)
    .trim() || 'piece-jointe';
}

/**
 * Écrit une pièce jointe dans le bucket privé.
 * @returns {{ path, name, size, contentType }}
 */
export async function uploadAttachment({ buffer, contentType, filename, ownerId }) {
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error('Type de fichier non autorisé (PDF, image ou Word attendus).');
  }
  if (!buffer || buffer.length === 0) throw new Error('Fichier vide.');
  if (buffer.length > MAX_ATTACHMENT_BYTES) {
    throw new Error('Fichier trop volumineux (5 Mo maximum).');
  }

  const ext = EXT[contentType] || 'bin';
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `avis-attachments/${ownerId}/${Date.now()}-${rand}.${ext}`;

  const file = adminBucket().file(path);
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: 'private, max-age=0' },
  });

  return { path, name: safeName(filename), size: buffer.length, contentType };
}

// Photo de profil conseiller : images seules, limite plus basse.
export const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024; // 3 Mo

/**
 * Écrit une photo de profil conseiller dans le bucket privé.
 * @returns {{ path }}
 */
export async function uploadConseillerPhoto({ buffer, contentType, ownerId }) {
  if (!IMAGE_TYPES.has(contentType)) {
    throw new Error('Image PNG, JPEG ou WebP attendue.');
  }
  if (!buffer || buffer.length === 0) throw new Error('Fichier vide.');
  if (buffer.length > MAX_PHOTO_BYTES) {
    throw new Error('Image trop volumineuse (3 Mo maximum).');
  }

  const ext = EXT[contentType] || 'jpg';
  const rand = Math.random().toString(36).slice(2, 8);
  const path = `conseiller-photos/${ownerId}/${Date.now()}-${rand}.${ext}`;

  const file = adminBucket().file(path);
  await file.save(buffer, {
    contentType,
    resumable: false,
    metadata: { cacheControl: 'private, max-age=0' },
  });

  return { path };
}

/**
 * Génère un lien de téléchargement signé, valable une heure.
 * Renvoie null en cas d'échec (l'affichage reste fonctionnel sans le lien).
 */
export async function signedUrlFor(path) {
  if (!path) return null;
  try {
    const [url] = await adminBucket().file(path).getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1 h
    });
    return url;
  } catch {
    return null;
  }
}

/**
 * Ajoute un lien signé éphémère aux pièces jointes d'une liste d'avis.
 * Ne modifie pas la base : enrichit seulement l'objet renvoyé au client.
 */
export async function attachSignedUrls(avisList = []) {
  return Promise.all(
    avisList.map(async (a) => {
      const att = a?.context?.attachment;
      if (!att?.path) return a;
      const downloadUrl = await signedUrlFor(att.path);
      return { ...a, context: { ...a.context, attachment: { ...att, downloadUrl } } };
    })
  );
}
