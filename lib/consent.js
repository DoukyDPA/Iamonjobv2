// ════════════════════════════════════════════════════════════════════════════
// Consentements — registre append-only (Admin SDK uniquement).
//
// Chaque validation crée un document, jamais réécrit. On garde ainsi l'historique
// complet : quand le consentement a été donné, sur quel objet, et quand il a été
// retiré (nouveau document de type 'revoke'). C'est la pièce qui prouve, en cas
// de litige ou de contrôle, que le traitement reposait sur un accord tracé.
//
// Structure : consents/{consentId}
//   beneficiaireId, authUid, type ('grant'|'revoke'), objet, version, createdAt
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';

const COL = 'consents';

// Version du texte de consentement présenté à la personne. À incrémenter si le
// libellé change, pour savoir quelle version chacun a acceptée.
export const CONSENT_VERSION = 'v1-2026-07';

export const CONSENT_OBJET =
  "Utilisation de mon CV et de mes données pour l'analyse, les pistes métier et les candidatures, dans le cadre de mon accompagnement.";

export async function recordConsent({ beneficiaireId, authUid, type = 'grant' }) {
  await adminDb.collection(COL).add({
    beneficiaireId,
    authUid,
    type,
    objet: CONSENT_OBJET,
    version: CONSENT_VERSION,
    createdAt: FieldValue.serverTimestamp(),
  });
}
