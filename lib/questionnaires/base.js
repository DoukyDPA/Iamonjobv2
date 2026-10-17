// ════════════════════════════════════════════════════════════════════════════
// Base de questionnaires du conseiller — serveur (Admin SDK uniquement).
//
// Deux origines, présentées ensemble au conseiller :
//   catalogue  les fiches écrites dans le code (PROMO 45+ S1 à S4), fixes
//   perso      les questionnaires créés par les conseillers dans l'appli,
//              partagés avec toute la structure, modifiables par leur auteur
//
// Structure Firestore : questionnairesPerso/{docId}
//   titre, intro, sections [{ titre, questions [...] }]  (même forme que le
//                           catalogue, voir lib/questionnaires/catalogue.js)
//   version       incrémentée à chaque modification
//   auteurUid, structureId
//   archived      true = retiré de la base (les réponses déjà reçues restent
//                 lisibles : on ne supprime jamais un questionnaire diffusé)
//   createdAt, updatedAt
//
// Id public d'un questionnaire perso : `perso-${docId}`.
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { QUESTIONNAIRES, getQuestionnaire, allQuestions } from '@/lib/questionnaires/catalogue';

const COL = 'questionnairesPerso';
const PREFIX = 'perso-';

const TYPES = new Set(['text', 'textarea', 'choice', 'multi', 'scales', 'list']);
const SOCLES = new Set([
  'confiance', 'moral', 'motivation', 'energie', 'change', 'frein', 'petitPas',
  'engagementTenu', 'obstacle', 'capable', 'engagement', 'metierVise', 'cap',
]);
const ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/;

const clip = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const ms = (ts) => ts?.toMillis?.() ?? null;

// Parcours qui utilisent un questionnaire (étiquette « Utilisé dans… »).
// Un même questionnaire peut servir dans plusieurs parcours et être envoyé seul.
function parcoursOf(questionnaireId, parcoursList = []) {
  return parcoursList
    .filter((p) => !p.archived && p.etapes.some((e) => e.questionnaireId === questionnaireId))
    .map((p) => {
      const e = p.etapes.find((x) => x.questionnaireId === questionnaireId);
      return { id: p.id, label: p.label, etape: e.n, etapeLabel: e.label };
    });
}

function toPublic(docId, data) {
  return {
    id: `${PREFIX}${docId}`,
    version: data.version || 1,
    titre: data.titre || 'Questionnaire',
    intro: data.intro || '',
    sections: data.sections || [],
  };
}

// ─── Validation d'une définition saisie par un conseiller ───────────────────

export function sanitizeDefinition(raw = {}) {
  const titre = clip(raw.titre, 120);
  if (!titre) throw Object.assign(new Error('Donnez un titre au questionnaire.'), { status: 400 });
  const intro = clip(raw.intro, 600);

  const used = new Set();
  let auto = 0;
  const nextId = (wanted) => {
    let id = ID_RE.test(String(wanted || '')) && !used.has(wanted) ? wanted : null;
    while (!id || used.has(id)) { auto += 1; id = `q${auto}`; }
    used.add(id);
    return id;
  };

  const sections = (Array.isArray(raw.sections) ? raw.sections : []).slice(0, 10).map((s, si) => {
    const questions = (Array.isArray(s?.questions) ? s.questions : []).slice(0, 30).map((q) => {
      const type = TYPES.has(q?.type) ? q.type : 'textarea';
      const label = clip(q?.label, 300);
      if (!label) return null;
      const out = { id: nextId(q?.id), type, label };
      if (q?.required) out.required = true;
      if (q?.socle && SOCLES.has(q.socle) && type !== 'scales') out.socle = q.socle;
      if (type === 'choice' || type === 'multi') {
        const options = [...new Set((Array.isArray(q.options) ? q.options : [])
          .map((o) => clip(o, 160)).filter(Boolean))].slice(0, 20);
        if (options.length < 2) {
          throw Object.assign(new Error(`« ${label.slice(0, 60)} » : indiquez au moins deux choix.`), { status: 400 });
        }
        out.options = options;
        if (q.other) out.other = true;
        if (type === 'multi') {
          const max = Number(q.max);
          if (Number.isFinite(max) && max >= 1 && max < options.length + 1) out.max = Math.round(max);
        }
      }
      if (type === 'scales') {
        const items = (Array.isArray(q.items) && q.items.length ? q.items : [{ label }])
          .slice(0, 8)
          .map((it, i) => {
            const l = clip(it?.label, 200);
            if (!l) return null;
            const item = { id: ID_RE.test(String(it?.id || '')) ? it.id : `n${i + 1}`, label: l };
            if (it?.socle && ['confiance', 'moral', 'motivation', 'energie'].includes(it.socle)) item.socle = it.socle;
            return item;
          })
          .filter(Boolean);
        // ids d'items uniques dans la question
        const seen = new Set();
        items.forEach((it, i) => { if (seen.has(it.id)) it.id = `n${i + 1}x`; seen.add(it.id); });
        out.items = items.length ? items : [{ id: 'n1', label }];
      }
      if (type === 'list') {
        const count = Number(q.count);
        out.count = Number.isFinite(count) ? Math.max(2, Math.min(6, Math.round(count))) : 3;
      }
      return out;
    }).filter(Boolean);
    return { titre: clip(s?.titre, 120) || (si === 0 ? titre : `Partie ${si + 1}`), questions };
  }).filter((s) => s.questions.length);

  const total = sections.reduce((n, s) => n + s.questions.length, 0);
  if (!total) throw Object.assign(new Error('Ajoutez au moins une question.'), { status: 400 });
  if (total > 60) throw Object.assign(new Error('60 questions au maximum.'), { status: 400 });
  return { titre, intro, sections };
}

// ─── Lecture ─────────────────────────────────────────────────────────────────

// Résout un questionnaire par son id public, catalogue ou perso. Un
// questionnaire perso archivé reste résolu : des réponses peuvent y renvoyer.
export async function resolveQuestionnaire(id) {
  const fromCatalogue = getQuestionnaire(id);
  if (fromCatalogue) return fromCatalogue;
  if (!String(id || '').startsWith(PREFIX)) return null;
  const docId = String(id).slice(PREFIX.length);
  if (!docId || docId.includes('/')) return null;
  const snap = await adminDb.doc(`${COL}/${docId}`).get();
  if (!snap.exists) return null;
  return { ...toPublic(snap.id, snap.data()), structureId: snap.data().structureId || 'default', archived: Boolean(snap.data().archived) };
}

// La base visible par un conseiller : catalogue + questionnaires de sa structure.
export async function listBase({ conseillerUid, structureId = 'default', parcoursList = [] }) {
  const catalogue = Object.values(QUESTIONNAIRES).map((q) => ({
    id: q.id,
    origine: 'catalogue',
    titre: q.titre,
    intro: q.intro || '',
    version: q.version,
    nbQuestions: allQuestions(q).length,
    parcours: parcoursOf(q.id, parcoursList),
    mine: false,
    questionnaire: q,
  }));

  const snap = await adminDb.collection(COL).where('structureId', '==', structureId).limit(300).get();
  const perso = snap.docs
    .filter((d) => !d.data().archived)
    .map((d) => {
      const data = d.data();
      const q = toPublic(d.id, data);
      return {
        id: q.id,
        origine: 'perso',
        titre: q.titre,
        intro: q.intro,
        version: q.version,
        nbQuestions: allQuestions(q).length,
        parcours: parcoursOf(q.id, parcoursList),
        mine: data.auteurUid === conseillerUid,
        updatedAt: ms(data.updatedAt),
        questionnaire: q,
      };
    })
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

  return [...catalogue, ...perso];
}

// ─── Écriture ────────────────────────────────────────────────────────────────

export async function createPerso({ conseillerUid, structureId = 'default', definition }) {
  const def = sanitizeDefinition(definition);
  const ref = adminDb.collection(COL).doc();
  await ref.set({
    ...def,
    version: 1,
    auteurUid: conseillerUid,
    structureId,
    archived: false,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: `${PREFIX}${ref.id}` };
}

async function ownedRef(id, conseillerUid) {
  if (!String(id || '').startsWith(PREFIX)) {
    throw Object.assign(new Error('Les questionnaires du catalogue ne se modifient pas : dupliquez-le.'), { status: 400 });
  }
  const ref = adminDb.doc(`${COL}/${String(id).slice(PREFIX.length)}`);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Questionnaire introuvable.'), { status: 404 });
  if (snap.data().auteurUid !== conseillerUid) {
    throw Object.assign(new Error('Seul son auteur peut modifier ce questionnaire.'), { status: 403 });
  }
  return { ref, snap };
}

export async function updatePerso({ id, conseillerUid, definition }) {
  const def = sanitizeDefinition(definition);
  const { ref, snap } = await ownedRef(id, conseillerUid);
  await ref.set({
    ...def,
    version: (snap.data().version || 1) + 1,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { id };
}

// Retire un questionnaire de la base, sans l'effacer (réponses existantes).
export async function archivePerso({ id, conseillerUid }) {
  const { ref } = await ownedRef(id, conseillerUid);
  await ref.set({ archived: true, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return { id };
}
