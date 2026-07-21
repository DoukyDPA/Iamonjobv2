// ════════════════════════════════════════════════════════════════════════════
// Consommation IA par personne accompagnée — modèle serveur (Admin SDK).
//
// But : suivre le coût. Chaque appel IA d'un bénéficiaire ajoute ses tokens à un
// compteur agrégé, jamais le contenu. On garde le total, le détail par mois (pour
// la facture courante) et par provider. Aucune donnée personnelle ici : la clé
// est l'identifiant de dossier, pas l'état civil.
//
// Structure Firestore : usage/{beneficiaireId}
//   tokensTotal   somme de tous les tokens
//   callsTotal    nombre d'appels IA
//   byProvider    { mistral, gemini } tokens par provider
//   months        { 'YYYY-MM': tokens } pour la conso du mois
//   updatedAt
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';

const COL = 'usage';

function monthKey(d = new Date()) {
  return d.toISOString().slice(0, 7); // 'YYYY-MM'
}

// Ajoute les tokens d'un appel au compteur d'une personne. Idempotence non
// requise : un appel = un incrément. À utiliser en « fire and forget » depuis la
// route IA, pour ne jamais retarder la réponse à la personne.
//
// Deux écritures, groupées en une seule requête atomique :
//   1. usage/{id}          — le registre détaillé (par provider, par mois)
//   2. beneficiaires/{id}  — un miroir léger des agrégats, pour que le tableau
//      de bord conseiller lise l'usage dans la même passe que la liste des
//      dossiers, sans seconde lecture par dossier.
export async function recordUsage({ beneficiaireId, provider = 'unknown', tokens = 0 }) {
  const n = Number(tokens) || 0;
  if (!beneficiaireId || n <= 0) return;
  const mk = monthKey();

  const usageRef = adminDb.doc(`${COL}/${beneficiaireId}`);
  const benRef = adminDb.doc(`beneficiaires/${beneficiaireId}`);
  const batch = adminDb.batch();

  batch.set(
    usageRef,
    {
      tokensTotal: FieldValue.increment(n),
      callsTotal: FieldValue.increment(1),
      byProvider: { [provider]: FieldValue.increment(n) },
      months: { [mk]: FieldValue.increment(n) },
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  // Miroir des agrégats sur le dossier. Préfixe « usage » pour ne pas heurter
  // les champs métier du bénéficiaire (code, statut, consentement…).
  batch.set(
    benRef,
    {
      usageTokensTotal: FieldValue.increment(n),
      usageCallsTotal: FieldValue.increment(1),
      usageMonths: { [mk]: FieldValue.increment(n) },
    },
    { merge: true }
  );

  await batch.commit();
}

// Récupère l'usage de plusieurs dossiers en une seule lecture groupée. Renvoie
// une table indexée par beneficiaireId, avec des zéros pour les dossiers sans
// consommation. Volume conseiller faible (10 à 50), donc getAll suffit.
export async function getUsageForBeneficiaires(ids = []) {
  const out = {};
  if (!ids.length) return out;
  const refs = ids.map((id) => adminDb.doc(`${COL}/${id}`));
  const snaps = await adminDb.getAll(...refs);
  const mk = monthKey();
  for (const s of snaps) {
    const d = s.exists ? s.data() : null;
    out[s.id] = {
      tokensTotal: d?.tokensTotal ?? 0,
      callsTotal: d?.callsTotal ?? 0,
      tokensThisMonth: d?.months?.[mk] ?? 0,
    };
  }
  return out;
}
