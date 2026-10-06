// ════════════════════════════════════════════════════════════════════════════
// Réponses aux questionnaires de suivi — modèle serveur (Admin SDK uniquement).
//
// Structure Firestore : questionnaireReponses/{id}
//   source           'live' (rempli dans l'app) | 'archive' (fiche importée)
//   conseillerUid    conseiller qui suit la personne
//   beneficiaireId   dossier Iamonjob (null pour une archive)
//   participant      code affiché (code AC-… ou code d'archive, ex. NKCC)
//   promo            libellé de la promo (« PROMO 45+ n°1 »)
//   parcoursId, etape, questionnaireId, version, titre
//   answers          réponses brutes, clés = id de question (live seulement)
//   detail           [{ section, question, reponse }] (archive seulement ; pour
//                    une réponse live, le détail est recalculé à la lecture)
//   socle            indicateurs communs (notes, engagement, frein…)
//   submittedAt, updatedAt
//
// Id d'une réponse live : `${beneficiaireId}__${questionnaireId}` : une seule
// réponse par personne et par questionnaire, que la personne peut corriger.
//
// Le dossier bénéficiaire porte le parcours suivi :
//   beneficiaires/{id}.parcoursId  ex. 'promo45' (null = pas de questionnaires)
//   beneficiaires/{id}.promo       ex. 'PROMO 45+ n°2'
//
// Accès client : aucun (règles Firestore fermées). Tout passe par les routes API.
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';
import {
  getParcours, getQuestionnaire, sanitizeAnswers, computeSocle, toDetail,
} from '@/lib/questionnaires/catalogue';

const COL = 'questionnaireReponses';

const ms = (ts) => ts?.toMillis?.() ?? (typeof ts === 'number' ? ts : null);

function serialize(d) {
  const data = d.data();
  return {
    id: d.id,
    source: data.source || 'live',
    beneficiaireId: data.beneficiaireId || null,
    participant: data.participant,
    promo: data.promo || null,
    parcoursId: data.parcoursId,
    etape: data.etape,
    questionnaireId: data.questionnaireId,
    version: data.version ?? null,
    titre: data.titre || '',
    socle: data.socle || {},
    submittedAt: ms(data.submittedAt),
    updatedAt: ms(data.updatedAt),
  };
}

// ─── Côté personne accompagnée ───────────────────────────────────────────────

// Parcours de la personne + état de chaque étape (rempli ou non).
export async function getParcoursState(beneficiaire) {
  const parcours = getParcours(beneficiaire?.parcoursId);
  if (!parcours) return { parcours: null, etapes: [] };

  const snap = await adminDb.collection(COL)
    .where('beneficiaireId', '==', beneficiaire.id).limit(50).get();
  const byQ = new Map(snap.docs.map((d) => [d.data().questionnaireId, d.data()]));

  const etapes = parcours.etapes.map((e) => {
    const q = getQuestionnaire(e.questionnaireId);
    const rep = q ? byQ.get(q.id) : null;
    return {
      n: e.n,
      label: e.label,
      questionnaireId: q?.id || null,
      titre: q?.titre || null,
      disponible: Boolean(q),
      rempli: Boolean(rep),
      submittedAt: ms(rep?.submittedAt),
      updatedAt: ms(rep?.updatedAt),
      // La personne retrouve ses réponses pour les relire ou les corriger.
      answers: rep?.answers || null,
    };
  });

  return {
    parcours: { id: parcours.id, label: parcours.label, description: parcours.description },
    promo: beneficiaire.promo || null,
    etapes,
  };
}

// Enregistre (ou corrige) la réponse d'une personne à un questionnaire de son
// parcours. Le questionnaire doit appartenir au parcours affecté au dossier.
export async function saveReponse({ beneficiaire, questionnaireId, answers: raw }) {
  const parcours = getParcours(beneficiaire?.parcoursId);
  if (!parcours) throw Object.assign(new Error("Aucun parcours n'est associé à votre accompagnement."), { status: 403 });

  const etape = parcours.etapes.find((e) => e.questionnaireId === questionnaireId);
  const questionnaire = getQuestionnaire(questionnaireId);
  if (!etape || !questionnaire) {
    throw Object.assign(new Error("Ce questionnaire ne fait pas partie de votre parcours."), { status: 400 });
  }

  const { answers, missing } = sanitizeAnswers(questionnaire, raw);
  if (missing.length) {
    throw Object.assign(new Error('Il manque des réponses obligatoires.'), { status: 400, missing });
  }

  const ref = adminDb.doc(`${COL}/${beneficiaire.id}__${questionnaire.id}`);
  const existing = await ref.get();
  await ref.set({
    source: 'live',
    conseillerUid: beneficiaire.conseillerUid || null,
    beneficiaireId: beneficiaire.id,
    participant: beneficiaire.code,
    promo: beneficiaire.promo || null,
    parcoursId: parcours.id,
    etape: etape.n,
    questionnaireId: questionnaire.id,
    version: questionnaire.version,
    titre: questionnaire.titre,
    answers,
    socle: computeSocle(questionnaire, answers),
    submittedAt: existing.exists ? existing.data().submittedAt : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { id: ref.id, etape: etape.n, created: !existing.exists };
}

// ─── Côté conseiller ─────────────────────────────────────────────────────────

// Toutes les réponses (live et archives) des personnes suivies par ce conseiller.
// Volume attendu : quelques centaines au plus ; tri en mémoire.
export async function listReponsesForConseiller(conseillerUid) {
  const snap = await adminDb.collection(COL)
    .where('conseillerUid', '==', conseillerUid).limit(2000).get();
  return snap.docs.map(serialize).sort((a, b) => (a.etape ?? 0) - (b.etape ?? 0));
}

// Une réponse complète, avec le détail lisible question par question.
export async function getReponseForConseiller(reponseId, conseillerUid) {
  const doc = await adminDb.doc(`${COL}/${reponseId}`).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.conseillerUid !== conseillerUid) return null;
  let detail = data.detail || [];
  if (data.source !== 'archive') {
    const q = getQuestionnaire(data.questionnaireId);
    detail = q ? toDetail(q, data.answers || {}) : [];
  }
  return { ...serialize(doc), detail };
}

// Affecte (ou retire) un parcours à des dossiers du conseiller.
export async function setParcoursForBeneficiaires({ conseillerUid, beneficiaireIds, parcoursId, promo }) {
  if (parcoursId && !getParcours(parcoursId)) throw Object.assign(new Error('Parcours inconnu.'), { status: 400 });
  const ids = [...new Set((beneficiaireIds || []).filter(Boolean))].slice(0, 100);
  const refs = ids.map((id) => adminDb.doc(`beneficiaires/${id}`));
  const snaps = await Promise.all(refs.map((r) => r.get()));
  const batch = adminDb.batch();
  let count = 0;
  snaps.forEach((s) => {
    if (!s.exists || s.data().conseillerUid !== conseillerUid) return;
    batch.set(s.ref, {
      parcoursId: parcoursId || null,
      promo: parcoursId ? String(promo || '').trim().slice(0, 80) || null : null,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    count += 1;
  });
  if (count) await batch.commit();
  return { updated: count };
}

// Efface les réponses d'un dossier (appelé par la purge RGPD du dossier).
export async function deleteReponsesForBeneficiaire(beneficiaireId) {
  const snap = await adminDb.collection(COL).where('beneficiaireId', '==', beneficiaireId).limit(500).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}
