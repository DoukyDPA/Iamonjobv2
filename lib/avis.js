// ════════════════════════════════════════════════════════════════════════════
// Avis conseiller — modèle serveur (Admin SDK uniquement).
//
// Une demande d'avis relie une personne accompagnée à son conseiller. Elle part
// de l'étape « emplois possibles » : la personne fige les offres affichées et
// demande un regard. Le conseiller répond quand il peut. Le lien tient sans que
// la personne se sente seule, et le conseiller n'agit que sur les cas ouverts.
//
// Structure Firestore : avisRequests/{avisId}
//   beneficiaireId    dossier concerné
//   beneficiaireCode  pseudonyme affiché côté conseiller (jamais l'état civil)
//   conseillerUid     destinataire de la demande
//   structureId       rattachement
//   context           { metier, codeRome, offers: [ {intitule, entreprise,
//                        lieu, url, source} ] }  photo des emplois au moment T
//   note              message court de la personne (optionnel)
//   status            'pending' | 'answered'
//   reply             réponse du conseiller (null tant qu'en attente)
//   createdAt, answeredAt
//
// Accès client : aucun. Tout passe par /api/avis et /api/conseiller/avis.
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';

const COL = 'avisRequests';
const MAX_OFFERS = 10;
const MAX_NOTE = 500;
const MAX_REPLY = 2000;

// Ne garde du contexte que ce qui est utile au conseiller, et le plafonne.
// Les descriptions longues et les compétences ne servent pas à donner un avis.
function trimContext(context = {}) {
  const offers = Array.isArray(context.offers) ? context.offers.slice(0, MAX_OFFERS) : [];
  return {
    metier: String(context.metier || '').slice(0, 120),
    codeRome: context.codeRome ? String(context.codeRome).slice(0, 10) : null,
    offers: offers.map((o) => ({
      intitule: String(o.intitule || 'Offre').slice(0, 160),
      entreprise: String(o.entreprise || '').slice(0, 120),
      lieu: String(o.lieu || '').slice(0, 120),
      url: o.url ? String(o.url).slice(0, 500) : null,
      source: o.source ? String(o.source).slice(0, 40) : null,
    })),
  };
}

// Crée une demande d'avis. `beneficiaire` vient de getBeneficiaireByAuthUid :
// on y lit conseillerUid et structureId, jamais fournis par le client.
export async function createAvisRequest({ beneficiaire, context, note = '' }) {
  if (!beneficiaire?.id) throw new Error('Bénéficiaire introuvable.');
  if (!beneficiaire.conseillerUid) throw new Error('Aucun conseiller rattaché.');

  const ref = adminDb.collection(COL).doc();
  await ref.set({
    beneficiaireId: beneficiaire.id,
    beneficiaireCode: beneficiaire.code || null,
    conseillerUid: beneficiaire.conseillerUid,
    structureId: beneficiaire.structureId || 'default',
    context: trimContext(context),
    note: String(note || '').slice(0, MAX_NOTE),
    status: 'pending',
    reply: null,
    createdAt: FieldValue.serverTimestamp(),
    answeredAt: null,
  });
  return { avisId: ref.id };
}

// Sérialise un document pour le client (timestamps en millisecondes).
function serialize(d) {
  const data = d.data();
  return {
    id: d.id,
    beneficiaireCode: data.beneficiaireCode ?? null,
    context: data.context ?? { metier: '', codeRome: null, offers: [] },
    note: data.note ?? '',
    status: data.status ?? 'pending',
    reply: data.reply ?? null,
    createdAt: data.createdAt?.toMillis?.() ?? null,
    answeredAt: data.answeredAt?.toMillis?.() ?? null,
  };
}

// Demandes d'une personne (les siennes uniquement). Tri récent d'abord, en
// mémoire, pour éviter un index composite (volume faible par personne).
export async function listAvisForBeneficiaire(beneficiaireId) {
  const snap = await adminDb.collection(COL)
    .where('beneficiaireId', '==', beneficiaireId)
    .limit(50)
    .get();
  const docs = snap.docs.map(serialize);
  docs.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return docs;
}

// File du conseiller : ses demandes, en attente d'abord, puis les répondues.
export async function listAvisForConseiller(conseillerUid) {
  const snap = await adminDb.collection(COL)
    .where('conseillerUid', '==', conseillerUid)
    .limit(200)
    .get();
  const docs = snap.docs.map(serialize);
  docs.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
  return docs;
}

// Le conseiller répond. On vérifie qu'il possède bien la demande avant d'écrire
// (défense en profondeur : la route garde déjà le rôle).
export async function answerAvis({ avisId, conseillerUid, reply }) {
  const ref = adminDb.doc(`${COL}/${avisId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Demande introuvable.');
  if (snap.data().conseillerUid !== conseillerUid) throw new Error('Accès refusé.');

  const text = String(reply || '').trim().slice(0, MAX_REPLY);
  if (!text) throw new Error('Réponse vide.');

  await ref.set({
    reply: text,
    status: 'answered',
    answeredAt: FieldValue.serverTimestamp(),
  }, { merge: true });
  return { ok: true };
}
