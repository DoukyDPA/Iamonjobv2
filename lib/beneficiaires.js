// ════════════════════════════════════════════════════════════════════════════
// Bénéficiaires — modèle serveur (Admin SDK uniquement).
//
// Un bénéficiaire est une personne accompagnée, désignée par un code
// pseudonyme (AC-AAAA-NNN) et jamais par son état civil dans l'application.
// Le conseiller crée le bénéficiaire, un code sort. La personne l'activera
// plus tard en choisissant son mot de passe (tranche suivante).
//
// Structure Firestore : beneficiaires/{beneficiaireId}
//   code           pseudonyme affiché partout (ex. AC-2026-041)
//   conseillerUid  propriétaire du dossier
//   structureId    rattachement (défaut 'default')
//   pilotage       'autonome' | 'mixte' | 'pilote'   (défaut 'autonome')
//   consentStatus  'pending' | 'granted' | 'revoked' (défaut 'pending')
//   status         'invited' | 'active'              (défaut 'invited')
//   authUid        uid Firebase du compte, posé à l'activation (null au départ)
//   candidaturesCount  compteur d'avancement, maintenu plus tard
//   createdAt, updatedAt
//
// Accès client : aucun. Tout passe par /api/conseiller/*.
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';

const COL = 'beneficiaires';
const CODE_PREFIX = 'AC';

// Suffixe aléatoire de 4 caractères, sans caractères ambigus (ni O/0 ni I/1).
// Le numéro séquentiel reste lisible pour les humains ; le suffixe empêche de
// deviner le code d'un autre bénéficiaire, ce qui protège l'étape d'activation.
const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomSuffix(len = 4) {
  let s = '';
  for (let i = 0; i < len; i++) {
    s += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)];
  }
  return s;
}

// Génère le prochain code séquentiel de l'année, via un compteur transactionnel
// (pas de collision, même si deux conseillers créent au même instant), et crée
// le document bénéficiaire dans la même transaction.
export async function createBeneficiaire({ conseillerUid, structureId = 'default' }) {
  if (!conseillerUid) throw new Error('conseillerUid requis.');

  const year = new Date().getFullYear();
  const counterRef = adminDb.doc(`counters/ben_${structureId}_${year}`);
  const benRef = adminDb.collection(COL).doc();

  const code = await adminDb.runTransaction(async (t) => {
    const snap = await t.get(counterRef);
    const next = (snap.exists ? snap.data().value : 0) + 1;
    t.set(counterRef, { value: next }, { merge: true });

    const seq = String(next).padStart(3, '0');
    const generated = `${CODE_PREFIX}-${year}-${seq}-${randomSuffix()}`;

    t.set(benRef, {
      code: generated,
      conseillerUid,
      structureId,
      pilotage: 'autonome',
      consentStatus: 'pending',
      status: 'invited',
      authUid: null,
      candidaturesCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return generated;
  });

  return { beneficiaireId: benRef.id, code };
}

// Liste les bénéficiaires d'un conseiller. Tri en mémoire (volume attendu
// 10 à 50 par conseiller), pour éviter un index composite.
export async function listBeneficiaires(conseillerUid) {
  const snap = await adminDb
    .collection(COL)
    .where('conseillerUid', '==', conseillerUid)
    .limit(200)
    .get();

  const docs = snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      code: data.code,
      pilotage: data.pilotage ?? 'autonome',
      consentStatus: data.consentStatus ?? 'pending',
      status: data.status ?? 'invited',
      candidaturesCount: data.candidaturesCount ?? 0,
      createdAt: data.createdAt?.toMillis?.() ?? null,
    };
  });

  docs.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return docs;
}

// Récupère un bénéficiaire par son id de dossier. Renvoie null si absent.
// Sert côté conseiller à retrouver l'authUid du dossier lié à un avis, pour
// vérifier qu'une fiche partagée appartient bien à cette personne.
export async function getBeneficiaireById(beneficiaireId) {
  if (!beneficiaireId) return null;
  const doc = await adminDb.doc(`${COL}/${beneficiaireId}`).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

// Récupère un bénéficiaire par son code pseudonyme. Renvoie null si absent.
export async function getBeneficiaireByCode(code) {
  const snap = await adminDb.collection(COL).where('code', '==', code).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// Retrouve le dossier d'une personne à partir de son compte Firebase (authUid),
// posé à l'activation. Sert aux routes bénéficiaire pour lire conseillerUid sans
// jamais faire confiance au client. Renvoie null si aucun dossier lié.
export async function getBeneficiaireByAuthUid(authUid) {
  if (!authUid) return null;
  const snap = await adminDb.collection(COL).where('authUid', '==', authUid).limit(1).get();
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

// Marque un bénéficiaire comme activé : compte lié, consentement accordé.
// Appelé une seule fois, après création du compte Firebase.
export async function markBeneficiaireActive({ beneficiaireId, authUid }) {
  await adminDb.doc(`${COL}/${beneficiaireId}`).set(
    {
      status: 'active',
      authUid,
      consentStatus: 'granted',
      activatedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
