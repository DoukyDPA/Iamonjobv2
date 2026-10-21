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

// ─── Échanges conseiller ↔ personne ──────────────────────────────────────
// Le conseiller prépare un CV dans son propre espace IAMONCV, puis l'envoie
// dans l'espace de la personne (il y apparaît comme un nouveau profil, qu'elle
// peut modifier). Il peut aussi récupérer le CV qu'elle a retouché. Plus de
// fichier qui circule par clé USB ou par e-mail.

const newProfileId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Liste les profils d'un compte (nom, date), sans leur contenu. */
export async function listProfilesMeta(uid) {
  const [metaSnap, profSnap] = await Promise.all([
    adminDb.doc(`${META}/${uid}`).get(),
    adminDb.collection(PROFILES).where('uid', '==', uid).select('profileId', 'updatedAt').limit(MAX_PROFILES).get(),
  ]);
  const names = new Map((metaSnap.exists ? metaSnap.data().list || [] : []).map((p) => [p.id, p.name]));
  return profSnap.docs.map((d) => ({
    id: d.data().profileId,
    name: names.get(d.data().profileId) || 'Profil',
    updatedAt: d.data().updatedAt?.toMillis?.() ?? null,
  })).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/** Lit le contenu d'un profil d'un compte. */
export async function readProfileOf(uid, profileId) {
  if (!isValidProfileId(profileId)) return null;
  const snap = await adminDb.doc(`${PROFILES}/${docId(uid, profileId)}`).get();
  if (!snap.exists) return null;
  try { return JSON.parse(snap.data().data || 'null'); } catch { return null; }
}

/** Ajoute un profil dans l'espace d'un compte. Devient actif si l'actuel est vide. */
export async function addProfileTo(uid, { name, data }) {
  const json = JSON.stringify(data || {});
  const size = Buffer.byteLength(json, 'utf8');
  if (size > MAX_PROFILE_BYTES) {
    throw Object.assign(new Error('Ce CV est trop lourd (souvent à cause de la photo).'), { status: 413 });
  }
  const profileId = newProfileId();
  const metaRef = adminDb.doc(`${META}/${uid}`);
  await adminDb.runTransaction(async (t) => {
    const m = await t.get(metaRef);
    const meta = m.exists ? m.data() : { active: null, list: [] };
    const list = Array.isArray(meta.list) ? meta.list.slice(0, MAX_PROFILES - 1) : [];
    let activeBlank = !meta.active;
    if (meta.active) {
      const cur = await t.get(adminDb.doc(`${PROFILES}/${docId(uid, meta.active)}`));
      try {
        const d = cur.exists ? JSON.parse(cur.data().data || 'null') : null;
        const db = d?.db || {};
        activeBlank = !d || (!(db.experiences || []).length && !(db.education || []).length && !((d.cv || {}).experiences || []).length);
      } catch { activeBlank = false; }
    }
    list.push({ id: profileId, name: String(name || 'CV').slice(0, 120) });
    t.set(metaRef, { active: activeBlank ? profileId : meta.active, list, updatedAt: FieldValue.serverTimestamp() });
    t.set(adminDb.doc(`${PROFILES}/${docId(uid, profileId)}`), { uid, profileId, data: json, size, updatedAt: FieldValue.serverTimestamp() });
  });
  return profileId;
}
