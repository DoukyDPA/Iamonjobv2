// ════════════════════════════════════════════════════════════════════════════
// Parcours de questionnaires — serveur (Admin SDK uniquement).
//
// Un parcours est un ENCHAÎNEMENT de questionnaires (Semaine 1, 2, 3…). Il sert :
//   usage 'promo'       à une promo : tout le groupe suit les mêmes étapes,
//                       le tableau de suivi compare les personnes semaine par semaine
//   usage 'individuel'  à une personne seule, à son rythme
// Déblocage des étapes :
//   'libre'       toutes les étapes écrites sont ouvertes d'emblée
//   'sequentiel'  une étape s'ouvre quand la précédente est remplie
//
// Deux origines, comme les questionnaires :
//   catalogue  PARCOURS de lib/questionnaires/catalogue.js (PROMO 45+), fixe
//   perso      parcoursPerso/{docId}, créé dans l'appli, partagé avec la
//              structure, id public `parcours-${docId}`
//
// Un parcours déjà suivi par des personnes garde ses étapes existantes à leur
// place (les fiches sont rangées par numéro d'étape) : on peut en ajouter à la
// fin et changer les intitulés ; pour réorganiser, on le duplique.
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { PARCOURS } from '@/lib/questionnaires/catalogue';
import { resolveQuestionnaire } from '@/lib/questionnaires/base';

const COL = 'parcoursPerso';
const PREFIX = 'parcours-';
const USAGES = new Set(['promo', 'individuel']);
const DEBLOCAGES = new Set(['libre', 'sequentiel']);

const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const ms = (ts) => ts?.toMillis?.() ?? null;

function normalizeCatalogue(p) {
  return { ...p, usage: p.usage || 'promo', deblocage: p.deblocage || 'libre', origine: 'catalogue' };
}

function fromDoc(d) {
  const x = d.data();
  return {
    id: `${PREFIX}${d.id}`,
    label: x.label,
    description: x.description || '',
    usage: x.usage || 'promo',
    deblocage: x.deblocage || 'libre',
    etapes: (x.etapes || []).map((e, i) => ({ n: i + 1, label: e.label || `Étape ${i + 1}`, questionnaireId: e.questionnaireId || null })),
    origine: 'perso',
    auteurUid: x.auteurUid,
    structureId: x.structureId || 'default',
    archived: Boolean(x.archived),
    updatedAt: ms(x.updatedAt),
  };
}

// Résout un parcours (catalogue ou perso). Un parcours archivé reste résolu :
// des personnes peuvent encore le suivre.
export async function resolveParcours(id) {
  if (!id) return null;
  if (PARCOURS[id]) return normalizeCatalogue(PARCOURS[id]);
  if (!String(id).startsWith(PREFIX)) return null;
  const docId = String(id).slice(PREFIX.length);
  if (!docId || docId.includes('/')) return null;
  const snap = await adminDb.doc(`${COL}/${docId}`).get();
  return snap.exists ? fromDoc(snap) : null;
}

// Parcours visibles par un conseiller, étapes enrichies du titre du questionnaire.
export async function listParcours({ conseillerUid, structureId = 'default', withArchived = false }) {
  const snap = await adminDb.collection(COL).where('structureId', '==', structureId).limit(200).get();
  const perso = snap.docs.map(fromDoc).filter((p) => withArchived || !p.archived)
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
  const all = [...Object.values(PARCOURS).map(normalizeCatalogue), ...perso];
  const titres = new Map();
  await Promise.all([...new Set(all.flatMap((p) => p.etapes.map((e) => e.questionnaireId)).filter(Boolean))]
    .map(async (qid) => { const q = await resolveQuestionnaire(qid); titres.set(qid, q?.titre || null); }));
  return all.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description || '',
    usage: p.usage,
    deblocage: p.deblocage,
    origine: p.origine,
    mine: p.origine === 'perso' && p.auteurUid === conseillerUid,
    archived: Boolean(p.archived),
    etapes: p.etapes.map((e) => ({ ...e, titre: e.questionnaireId ? titres.get(e.questionnaireId) || null : null })),
  }));
}

// ─── Écriture ────────────────────────────────────────────────────────────────

async function sanitize(raw = {}, structureId) {
  const label = clip(raw.label, 80);
  if (!label) throw Object.assign(new Error('Donnez un nom au parcours.'), { status: 400 });
  const etapesIn = (Array.isArray(raw.etapes) ? raw.etapes : []).slice(0, 20);
  if (!etapesIn.length) throw Object.assign(new Error('Ajoutez au moins une étape.'), { status: 400 });
  const etapes = [];
  for (const [i, e] of etapesIn.entries()) {
    const qid = clip(e?.questionnaireId, 80) || null;
    if (qid) {
      const q = await resolveQuestionnaire(qid);
      if (!q || (q.structureId && q.structureId !== structureId)) {
        throw Object.assign(new Error(`Étape ${i + 1} : questionnaire introuvable.`), { status: 400 });
      }
    }
    etapes.push({ label: clip(e?.label, 60) || `Étape ${i + 1}`, questionnaireId: qid });
  }
  if (!etapes.some((e) => e.questionnaireId)) throw Object.assign(new Error('Choisissez au moins un questionnaire.'), { status: 400 });
  return {
    label,
    description: clip(raw.description, 300),
    usage: USAGES.has(raw.usage) ? raw.usage : 'promo',
    deblocage: DEBLOCAGES.has(raw.deblocage) ? raw.deblocage : 'libre',
    etapes,
  };
}

export async function createParcours({ conseillerUid, structureId = 'default', definition }) {
  const def = await sanitize(definition, structureId);
  const ref = adminDb.collection(COL).doc();
  await ref.set({
    ...def, auteurUid: conseillerUid, structureId, archived: false,
    createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: `${PREFIX}${ref.id}` };
}

async function ownedRef(id, conseillerUid) {
  if (!String(id || '').startsWith(PREFIX)) {
    throw Object.assign(new Error('Le parcours du catalogue ne se modifie pas : dupliquez-le pour l’adapter.'), { status: 400 });
  }
  const ref = adminDb.doc(`${COL}/${String(id).slice(PREFIX.length)}`);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Parcours introuvable.'), { status: 404 });
  if (snap.data().auteurUid !== conseillerUid) throw Object.assign(new Error('Seul son auteur peut modifier ce parcours.'), { status: 403 });
  return { ref, snap };
}

export async function updateParcours({ id, conseillerUid, structureId = 'default', definition }) {
  const { ref, snap } = await ownedRef(id, conseillerUid);
  const def = await sanitize(definition, structureId);
  // Parcours déjà suivi : les étapes existantes restent à leur place.
  const used = await adminDb.collection('beneficiaires').where('parcoursId', '==', id).limit(1).get();
  if (!used.empty) {
    const before = snap.data().etapes || [];
    const moved = before.some((e, i) => e.questionnaireId && def.etapes[i]?.questionnaireId !== e.questionnaireId);
    if (moved) {
      throw Object.assign(new Error('Ce parcours est déjà suivi : vous pouvez ajouter des étapes à la fin ou changer les intitulés. Pour réorganiser ou remplacer un questionnaire, dupliquez-le.'), { status: 409 });
    }
  }
  await ref.set({ ...def, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { id };
}

export async function archiveParcours({ id, conseillerUid }) {
  const { ref } = await ownedRef(id, conseillerUid);
  await ref.set({ archived: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { id };
}
