// ════════════════════════════════════════════════════════════════════════════
// Envois du conseiller — modèle serveur (Admin SDK uniquement).
//
// Le conseiller prend l'initiative : il envoie une offre, un message ou un
// questionnaire à une personne, ou à toute une promo (un envoi par personne).
// Côté personne, un bouton apparaît : « Offre de votre conseiller »,
// « Message de votre conseiller », « Merci de répondre à quelques questions ».
//
// Structure Firestore : envois/{envoiId}
//   type             'offre' | 'message' | 'questionnaire'
//   conseillerUid    expéditeur (suit le dossier en cas de transfert)
//   structureId
//   beneficiaireId, beneficiaireCode
//   promo            libellé de la promo visée, ou null (envoi individuel)
//   offre            { intitule, entreprise, lieu, url }       (type offre)
//   texte            message, ou mot d'accompagnement d'une offre/questionnaire
//   questionnaire    { id, titre, version, etape }  etape = n si le
//                    questionnaire fait partie du parcours de la personne
//   status           'nouveau' | 'vu' | 'repondu'
//   reponse          { texte } réponse libre de la personne (offre, message)
//   reponseId        questionnaireReponses/{id} (type questionnaire)
//   createdAt, vuAt, reponduAt
//
// Un questionnaire du parcours de la personne (ex. PROMO 45+ S3) est enregistré
// à sa place habituelle, dans le tableau de suivi de la promo. Un autre
// questionnaire est rangé à part : questionnaireReponses/envoi__{envoiId}.
//
// Accès client : aucun. Tout passe par /api/envois et /api/conseiller/envois.
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { getParcours, sanitizeAnswers, computeSocle, toDetail } from '@/lib/questionnaires/catalogue';
import { resolveQuestionnaire } from '@/lib/questionnaires/base';
import { saveReponse } from '@/lib/questionnaires/reponses';

const COL = 'envois';
const TYPES = new Set(['offre', 'message', 'questionnaire']);
const MAX_TEXTE = 3000;
const MAX_CIBLES = 100;

const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const ms = (ts) => ts?.toMillis?.() ?? null;

function cleanUrl(u) {
  const s = clip(u, 600);
  if (!s) return '';
  try {
    const url = new URL(s);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch { return ''; }
}

function serialize(d) {
  const data = d.data();
  return {
    id: d.id,
    type: data.type,
    beneficiaireId: data.beneficiaireId,
    beneficiaireCode: data.beneficiaireCode || null,
    promo: data.promo || null,
    offre: data.offre || null,
    texte: data.texte || '',
    questionnaire: data.questionnaire || null,
    status: data.status || 'nouveau',
    reponse: data.reponse || null,
    reponseId: data.reponseId || null,
    createdAt: ms(data.createdAt),
    vuAt: ms(data.vuAt),
    reponduAt: ms(data.reponduAt),
  };
}

// ─── Côté conseiller ─────────────────────────────────────────────────────────

// Crée un envoi par personne ciblée. Seuls les dossiers du conseiller sont
// servis ; les autres sont ignorés en silence (défense en profondeur).
export async function createEnvois({ conseillerUid, structureId = 'default', beneficiaireIds, type, payload = {}, promo = null }) {
  if (!TYPES.has(type)) throw Object.assign(new Error("Type d'envoi inconnu."), { status: 400 });

  const ids = [...new Set((beneficiaireIds || []).filter((x) => typeof x === 'string' && x && !x.includes('/')))].slice(0, MAX_CIBLES);
  if (!ids.length) throw Object.assign(new Error('Choisissez au moins une personne.'), { status: 400 });

  const texte = clip(payload.texte, MAX_TEXTE);
  let offre = null;
  let questionnaire = null;

  if (type === 'message' && !texte) throw Object.assign(new Error('Le message est vide.'), { status: 400 });
  if (type === 'offre') {
    offre = {
      intitule: clip(payload.offre?.intitule, 200),
      entreprise: clip(payload.offre?.entreprise, 160),
      lieu: clip(payload.offre?.lieu, 120),
      url: cleanUrl(payload.offre?.url),
    };
    if (!offre.intitule) throw Object.assign(new Error("Indiquez l'intitulé de l'offre."), { status: 400 });
  }
  if (type === 'questionnaire') {
    const q = await resolveQuestionnaire(payload.questionnaireId);
    if (!q || q.archived) throw Object.assign(new Error('Questionnaire introuvable.'), { status: 400 });
    if (q.structureId && q.structureId !== structureId) throw Object.assign(new Error('Questionnaire introuvable.'), { status: 400 });
    questionnaire = { id: q.id, titre: q.titre, version: q.version };
  }

  const snaps = await adminDb.getAll(...ids.map((id) => adminDb.doc(`beneficiaires/${id}`)));
  const cibles = snaps.filter((s) => s.exists && s.data().conseillerUid === conseillerUid);
  if (!cibles.length) throw Object.assign(new Error('Aucune des personnes choisies ne vous est rattachée.'), { status: 403 });

  const batch = adminDb.batch();
  const created = [];
  for (const s of cibles) {
    const ben = s.data();
    const ref = adminDb.collection(COL).doc();
    let q = null;
    if (questionnaire) {
      const etape = getParcours(ben.parcoursId)?.etapes.find((e) => e.questionnaireId === questionnaire.id)?.n ?? null;
      q = { ...questionnaire, etape };
    }
    batch.set(ref, {
      type,
      conseillerUid,
      structureId: ben.structureId || structureId,
      beneficiaireId: s.id,
      beneficiaireCode: ben.code || null,
      promo: promo ? clip(promo, 80) : null,
      offre,
      texte,
      questionnaire: q,
      status: 'nouveau',
      reponse: null,
      reponseId: null,
      createdAt: FieldValue.serverTimestamp(),
      vuAt: null,
      reponduAt: null,
    });
    created.push(ref.id);
  }
  await batch.commit();

  // Pas d'email à la personne : son compte repose sur une adresse fictive tirée
  // de son code (aucune adresse réelle n'est demandée). Le bouton l'attend à
  // sa prochaine connexion.
  return { created: created.length, ignored: ids.length - cibles.length };
}

// Envois du conseiller, éventuellement limités à une personne. Récent d'abord.
export async function listEnvoisForConseiller(conseillerUid, { beneficiaireId = null } = {}) {
  let q = adminDb.collection(COL).where('conseillerUid', '==', conseillerUid);
  if (beneficiaireId) q = q.where('beneficiaireId', '==', beneficiaireId);
  const snap = await q.limit(beneficiaireId ? 200 : 1000).get();
  return snap.docs.map(serialize).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

// Le conseiller retire un envoi (erreur de destinataire, offre pourvue…).
export async function deleteEnvoi({ envoiId, conseillerUid }) {
  const ref = adminDb.doc(`${COL}/${envoiId}`);
  const snap = await ref.get();
  if (!snap.exists) throw Object.assign(new Error('Envoi introuvable.'), { status: 404 });
  if (snap.data().conseillerUid !== conseillerUid) throw Object.assign(new Error('Accès refusé.'), { status: 403 });
  await ref.delete();
  return { ok: true };
}

// ─── Côté personne accompagnée ───────────────────────────────────────────────

// Envois reçus, avec la définition des questionnaires et les réponses déjà
// données (pour relire ou corriger).
export async function listEnvoisForBeneficiaire(beneficiaire) {
  const snap = await adminDb.collection(COL).where('beneficiaireId', '==', beneficiaire.id).limit(200).get();
  const envois = snap.docs.map(serialize).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  const questionnaires = {};
  const answers = {};
  await Promise.all(envois.filter((e) => e.type === 'questionnaire' && e.questionnaire?.id).map(async (e) => {
    if (!questionnaires[e.questionnaire.id]) {
      const q = await resolveQuestionnaire(e.questionnaire.id);
      if (q) questionnaires[q.id] = { id: q.id, version: q.version, titre: q.titre, intro: q.intro, sections: q.sections };
    }
    // Un questionnaire du parcours déjà rempli (avant l'envoi) se rouvre avec
    // ses réponses : la personne corrige au lieu de tout ressaisir.
    const inParcours = getParcours(beneficiaire.parcoursId)?.etapes.some((x) => x.questionnaireId === e.questionnaire.id);
    const repId = e.reponseId || (inParcours ? `${beneficiaire.id}__${e.questionnaire.id}` : null);
    if (repId) {
      const r = await adminDb.doc(`questionnaireReponses/${repId}`).get();
      if (r.exists && r.data().beneficiaireId === beneficiaire.id) {
        answers[e.id] = { answers: r.data().answers || null, importe: r.data().source === 'archive' };
      }
    }
  }));
  // Pas de lien interne vers les fiches côté client.
  return { envois: envois.map(({ reponseId, ...e }) => ({ ...e, ...(answers[e.id] || {}) })), questionnaires };
}

async function ownEnvoi(envoiId, beneficiaire) {
  if (!envoiId || String(envoiId).includes('/')) throw Object.assign(new Error('Envoi introuvable.'), { status: 404 });
  const ref = adminDb.doc(`${COL}/${envoiId}`);
  const snap = await ref.get();
  if (!snap.exists || snap.data().beneficiaireId !== beneficiaire.id) {
    throw Object.assign(new Error('Envoi introuvable.'), { status: 404 });
  }
  return { ref, data: snap.data() };
}

export async function markVu({ envoiId, beneficiaire }) {
  const { ref, data } = await ownEnvoi(envoiId, beneficiaire);
  if (data.status === 'nouveau') {
    await ref.set({ status: 'vu', vuAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  return { ok: true };
}

// Réponse libre à une offre ou un message. Le conseiller est prévenu.
export async function replyEnvoi({ envoiId, beneficiaire, texte }) {
  const { ref, data } = await ownEnvoi(envoiId, beneficiaire);
  if (data.type === 'questionnaire') throw Object.assign(new Error('Répondez directement au questionnaire.'), { status: 400 });
  const t = clip(texte, 2000);
  if (!t) throw Object.assign(new Error('Votre réponse est vide.'), { status: 400 });
  await ref.set({
    status: 'repondu',
    reponse: { texte: t },
    vuAt: data.vuAt || FieldValue.serverTimestamp(),
    reponduAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ok: true, conseillerUid: data.conseillerUid };
}

// Réponse à un questionnaire envoyé.
export async function answerQuestionnaireEnvoi({ envoiId, beneficiaire, answers: raw }) {
  const { ref, data } = await ownEnvoi(envoiId, beneficiaire);
  if (data.type !== 'questionnaire' || !data.questionnaire?.id) {
    throw Object.assign(new Error("Cet envoi n'est pas un questionnaire."), { status: 400 });
  }
  const qid = data.questionnaire.id;

  // Questionnaire du parcours : même enregistrement que depuis « Mes questionnaires ».
  const parcours = getParcours(beneficiaire.parcoursId);
  if (parcours?.etapes.some((e) => e.questionnaireId === qid)) {
    const res = await saveReponse({ beneficiaire, questionnaireId: qid, answers: raw });
    await closeEnvoisForQuestionnaire({ beneficiaireId: beneficiaire.id, questionnaireId: qid, reponseId: res.id });
    return { ok: true, created: res.created };
  }

  const questionnaire = await resolveQuestionnaire(qid);
  if (!questionnaire) throw Object.assign(new Error("Ce questionnaire n'existe plus."), { status: 410 });
  const { answers, missing } = sanitizeAnswers(questionnaire, raw);
  if (missing.length) throw Object.assign(new Error('Il manque des réponses obligatoires.'), { status: 400, missing });

  const repRef = adminDb.doc(`questionnaireReponses/envoi__${ref.id}`);
  const existing = await repRef.get();
  await repRef.set({
    source: 'envoi',
    envoiId: ref.id,
    conseillerUid: beneficiaire.conseillerUid || data.conseillerUid,
    beneficiaireId: beneficiaire.id,
    participant: beneficiaire.code,
    promo: beneficiaire.promo || null,
    parcoursId: beneficiaire.parcoursId || null,
    etape: null,
    questionnaireId: questionnaire.id,
    version: questionnaire.version,
    titre: questionnaire.titre,
    answers,
    socle: computeSocle(questionnaire, answers),
    submittedAt: existing.exists ? existing.data().submittedAt : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await ref.set({
    status: 'repondu',
    reponseId: repRef.id,
    vuAt: data.vuAt || FieldValue.serverTimestamp(),
    reponduAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ok: true, created: !existing.exists };
}

// Un questionnaire du parcours rempli (par l'envoi ou par « Mes questionnaires »)
// solde les envois en attente qui le demandaient.
export async function closeEnvoisForQuestionnaire({ beneficiaireId, questionnaireId, reponseId }) {
  const snap = await adminDb.collection(COL).where('beneficiaireId', '==', beneficiaireId).limit(200).get();
  const open = snap.docs.filter((d) => {
    const x = d.data();
    return x.type === 'questionnaire' && x.questionnaire?.id === questionnaireId && x.status !== 'repondu';
  });
  if (!open.length) return;
  const batch = adminDb.batch();
  open.forEach((d) => batch.set(d.ref, {
    status: 'repondu',
    reponseId,
    vuAt: d.data().vuAt || FieldValue.serverTimestamp(),
    reponduAt: FieldValue.serverTimestamp(),
  }, { merge: true }));
  await batch.commit();
}

// Détail lisible d'une réponse à un questionnaire envoyé (vue conseiller).
export async function detailForQuestionnaire(questionnaireId, answers) {
  const q = await resolveQuestionnaire(questionnaireId);
  return q ? toDetail(q, answers || {}) : [];
}

// Purge RGPD d'un dossier.
export async function deleteEnvoisForBeneficiaire(beneficiaireId) {
  const snap = await adminDb.collection(COL).where('beneficiaireId', '==', beneficiaireId).limit(500).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}
