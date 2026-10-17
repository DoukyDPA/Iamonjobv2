// ════════════════════════════════════════════════════════════════════════════
// Réponses aux questionnaires de suivi — modèle serveur (Admin SDK uniquement).
//
// Structure Firestore : questionnaireReponses/{id}
//   source           'live' (rempli dans l'app) | 'archive' (fiche importée)
//   conseillerUid    conseiller qui suit la personne
//   beneficiaireId   dossier Iamonjob (null pour une archive non rattachée)
//   archiveCode      code d'origine d'une fiche archivée rattachée à un dossier
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
  sanitizeAnswers, computeSocle, toDetail,
} from '@/lib/questionnaires/catalogue';
import { resolveQuestionnaire } from '@/lib/questionnaires/base';
import { resolveParcours } from '@/lib/questionnaires/parcours';

const COL = 'questionnaireReponses';

const ms = (ts) => ts?.toMillis?.() ?? (typeof ts === 'number' ? ts : null);

function serialize(d) {
  const data = d.data();
  return {
    id: d.id,
    source: data.source || 'live',
    envoiId: data.envoiId || null,
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
  const parcours = await resolveParcours(beneficiaire?.parcoursId);
  if (!parcours) return { parcours: null, etapes: [], questionnaires: {} };

  const snap = await adminDb.collection(COL)
    .where('beneficiaireId', '==', beneficiaire.id).limit(100).get();
  const byQ = new Map(snap.docs.map((d) => [d.data().questionnaireId, d.data()]));

  const qs = await Promise.all(parcours.etapes.map((e) => resolveQuestionnaire(e.questionnaireId)));
  const questionnaires = {};
  qs.forEach((q) => { if (q) questionnaires[q.id] = { id: q.id, version: q.version, titre: q.titre, intro: q.intro, sections: q.sections }; });

  // Déblocage séquentiel : une étape s'ouvre quand la précédente est remplie.
  let precedenteRemplie = true;
  const etapes = parcours.etapes.map((e, i) => {
    const q = qs[i];
    const rep = q ? byQ.get(q.id) : null;
    const ouverte = Boolean(q) && (parcours.deblocage !== 'sequentiel' || precedenteRemplie);
    if (q) precedenteRemplie = Boolean(rep);
    return {
      n: e.n,
      label: e.label,
      questionnaireId: q?.id || null,
      titre: q?.titre || null,
      disponible: ouverte,
      verrouille: Boolean(q) && !ouverte,
      rempli: Boolean(rep),
      // Fiche remplie hors de l'app puis rattachée au dossier : lecture seule.
      importe: rep?.source === 'archive',
      submittedAt: ms(rep?.submittedAt),
      updatedAt: ms(rep?.updatedAt),
      // La personne retrouve ses réponses pour les relire ou les corriger.
      answers: rep?.answers || null,
    };
  });

  return {
    parcours: { id: parcours.id, label: parcours.label, description: parcours.description, usage: parcours.usage, deblocage: parcours.deblocage },
    promo: beneficiaire.promo || null,
    questionnaires,
    // Promo terminée : l'accompagnement continue à un autre rythme, les fiches
    // restent consultables et peuvent encore être remplies.
    promoArchivee: Boolean(beneficiaire.promoArchivee),
    etapes,
  };
}

// Enregistre (ou corrige) la réponse d'une personne à un questionnaire de son
// parcours. Le questionnaire doit appartenir au parcours affecté au dossier.
export async function saveReponse({ beneficiaire, questionnaireId, answers: raw }) {
  const parcours = await resolveParcours(beneficiaire?.parcoursId);
  if (!parcours) throw Object.assign(new Error("Aucun parcours n'est associé à votre accompagnement."), { status: 403 });

  const etape = parcours.etapes.find((e) => e.questionnaireId === questionnaireId);
  const questionnaire = etape ? await resolveQuestionnaire(questionnaireId) : null;
  if (!etape || !questionnaire) {
    throw Object.assign(new Error("Ce questionnaire ne fait pas partie de votre parcours."), { status: 400 });
  }

  const { answers, missing } = sanitizeAnswers(questionnaire, raw);
  if (missing.length) {
    throw Object.assign(new Error('Il manque des réponses obligatoires.'), { status: 400, missing });
  }

  const ref = adminDb.doc(`${COL}/${beneficiaire.id}__${questionnaire.id}`);
  const existing = await ref.get();
  if (existing.exists && existing.data().source === 'archive') {
    throw Object.assign(new Error('Ce questionnaire a déjà été transmis à votre conseiller.'), { status: 409 });
  }
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
    // Détail figé à l'envoi : la fiche reste lisible si le questionnaire est
    // modifié plus tard (nouvelle version).
    detail: toDetail(questionnaire, answers),
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
    const q = await resolveQuestionnaire(data.questionnaireId);
    // Même version : on recalcule ; sinon on garde le détail figé à l'envoi.
    if (q && (q.version === data.version || !data.detail?.length)) detail = toDetail(q, data.answers || {});
  }
  return { ...serialize(doc), detail };
}

// Affecte (ou retire) un parcours à des dossiers du conseiller.
export async function setParcoursForBeneficiaires({ conseillerUid, beneficiaireIds, parcoursId, promo }) {
  const parcours = parcoursId ? await resolveParcours(parcoursId) : null;
  if (parcoursId && !parcours) throw Object.assign(new Error('Parcours inconnu.'), { status: 400 });
  // Parcours individuel : pas de promo. Parcours de promo : un nom est requis.
  const label = parcours?.usage === 'individuel' ? '' : String(promo || '').trim().slice(0, 80);
  if (parcours && parcours.usage !== 'individuel' && !label) throw Object.assign(new Error('Donnez un nom à la promo.'), { status: 400 });
  const ids = [...new Set((beneficiaireIds || []).filter(Boolean))].slice(0, 100);
  const refs = ids.map((id) => adminDb.doc(`beneficiaires/${id}`));
  const snaps = await Promise.all(refs.map((r) => r.get()));
  const batch = adminDb.batch();
  let count = 0;
  snaps.forEach((s) => {
    if (!s.exists || s.data().conseillerUid !== conseillerUid) return;
    batch.set(s.ref, {
      parcoursId: parcoursId || null,
      promo: parcoursId ? label || null : null,
      promoArchivee: false,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    count += 1;
  });
  if (count) await batch.commit();
  return { updated: count };
}

// Archive (ou réactive) une promo : tous les dossiers du conseiller portant ce
// parcours et ce libellé. Rien n'est supprimé, l'accompagnement continue.
export async function setPromoArchivee({ conseillerUid, parcoursId, promo, archivee }) {
  if (!(await resolveParcours(parcoursId))) throw Object.assign(new Error('Parcours inconnu.'), { status: 400 });
  const snap = await adminDb.collection('beneficiaires').where('conseillerUid', '==', conseillerUid).limit(500).get();
  const docs = snap.docs.filter((d) => d.data().parcoursId === parcoursId && (d.data().promo || '') === (promo || ''));
  if (!docs.length) throw Object.assign(new Error('Aucun dossier dans cette promo.'), { status: 404 });
  const batch = adminDb.batch();
  docs.forEach((d) => batch.set(d.ref, {
    promoArchivee: Boolean(archivee),
    promoArchiveeAt: archivee ? FieldValue.serverTimestamp() : null,
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true }));
  await batch.commit();
  return { updated: docs.length };
}

// Efface les réponses d'un dossier (appelé par la purge RGPD du dossier).
export async function deleteReponsesForBeneficiaire(beneficiaireId) {
  const snap = await adminDb.collection(COL).where('beneficiaireId', '==', beneficiaireId).limit(500).get();
  await Promise.all(snap.docs.map((d) => d.ref.delete()));
}
