// ════════════════════════════════════════════════════════════════════════════
// Espace IAMONCV enregistré sur le compte.
//
// Avant : IAMONCV gardait tout dans le navigateur (localStorage). Sur
// l'ordinateur d'une médiathèque, le travail disparaissait d'une semaine sur
// l'autre, et la personne suivante pouvait le voir. Désormais, chaque compte a
// son espace côté serveur :
//
//   iamoncv_meta/{uid}                 { active, list: [{ id, name }], updatedAt }
//   iamoncv_profiles/{uid}__{profilId} { uid, profileId, data (JSON), size, updatedAt }
//
// Un profil par document : un conseiller peut tenir un profil par personne
// accompagnée sans buter sur la limite de 1 Mo d'un document Firestore. Le
// contenu est stocké en texte JSON, tel qu'IAMONCV le manipule.
// Accès serveur uniquement (Admin SDK) ; les règles Firestore refusent tout
// accès direct depuis le navigateur.
// ════════════════════════════════════════════════════════════════════════════

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

const META = 'iamoncv_meta';
const PROFILES = 'iamoncv_profiles';

// Un profil (données + CV + photo réduite) reste bien en dessous de 1 Mo.
// Au-delà, c'est presque toujours une photo non réduite : on refuse clairement.
export const MAX_PROFILE_BYTES = 900 * 1024;
export const MAX_PROFILES = 200;

const PROFILE_ID_RE = /^[a-z0-9]{4,40}$/i;
export const isValidProfileId = (id) => PROFILE_ID_RE.test(String(id || ''));

const docId = (uid, profileId) => `${uid}__${profileId}`;

function cleanMeta(meta) {
  const list = Array.isArray(meta?.list) ? meta.list : [];
  const clean = list
    .filter((p) => p && isValidProfileId(p.id))
    .slice(0, MAX_PROFILES)
    .map((p) => ({ id: String(p.id), name: String(p.name || 'Profil').slice(0, 120) }));
  const active = clean.some((p) => p.id === meta?.active) ? String(meta.active) : (clean[0]?.id || null);
  return { active, list: clean };
}

/** Lit tout l'espace d'un compte : liste des profils et contenu de chacun. */
export async function readWorkspace(uid) {
  const [metaSnap, profSnap] = await Promise.all([
    adminDb.doc(`${META}/${uid}`).get(),
    adminDb.collection(PROFILES).where('uid', '==', uid).limit(MAX_PROFILES).get(),
  ]);
  const profiles = {};
  for (const d of profSnap.docs) {
    const v = d.data();
    try { profiles[v.profileId] = JSON.parse(v.data || 'null'); } catch { /* profil corrompu : ignoré */ }
  }
  const meta = metaSnap.exists ? cleanMeta(metaSnap.data()) : null;
  return { meta, profiles };
}

/**
 * Applique un lot de changements : liste des profils (meta) et profils
 * modifiés ou supprimés (valeur null). Un seul batch : tout passe, ou rien.
 */
export async function writeWorkspace(uid, { meta, profiles }) {
  const batch = adminDb.batch();
  let ops = 0;

  if (meta) {
    batch.set(adminDb.doc(`${META}/${uid}`), { ...cleanMeta(meta), updatedAt: FieldValue.serverTimestamp() });
    ops++;
  }

  for (const [profileId, value] of Object.entries(profiles || {})) {
    if (!isValidProfileId(profileId)) {
      throw Object.assign(new Error('Identifiant de profil invalide.'), { status: 400 });
    }
    const ref = adminDb.doc(`${PROFILES}/${docId(uid, profileId)}`);
    if (value === null) {
      batch.delete(ref);
    } else {
      const json = JSON.stringify(value);
      const size = Buffer.byteLength(json, 'utf8');
      if (size > MAX_PROFILE_BYTES) {
        throw Object.assign(
          new Error('Ce CV est trop lourd pour être enregistré (souvent à cause de la photo). Essayez une photo plus petite.'),
          { status: 413 }
        );
      }
      batch.set(ref, { uid, profileId, data: json, size, updatedAt: FieldValue.serverTimestamp() });
    }
    ops++;
    if (ops > 450) throw Object.assign(new Error('Trop de changements en une fois.'), { status: 400 });
  }

  if (ops) await batch.commit();
  return { ops };
}

/** Efface tout l'espace IAMONCV d'un compte (suppression de compte, purge). */
export async function deleteIamoncvData(uid) {
  if (!uid) return 0;
  const snap = await adminDb.collection(PROFILES).where('uid', '==', uid).limit(MAX_PROFILES).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
  await adminDb.doc(`${META}/${uid}`).delete();
  return snap.size;
}
