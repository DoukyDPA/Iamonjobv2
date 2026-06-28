// ════════════════════════════════════════════════════════════════════════════
// File d'envoi — Lot 5 du module candidatures spontanées
//
// Logique :
//   1. Filtre les entreprises à envoyer : decision=keep, email renseigné, pas encore sentAt
//   2. Prend un lot de MAX_PER_BATCH (défaut 5) pour étaler sur la journée
//   3. Envoie chaque mail avec un délai aléatoire entre chaque (délivrabilité)
//   4. Met à jour companies[i].sentAt dans Firestore après chaque succès
//   5. Si toutes les entreprises keep+email sont envoyées → statut 'done'
//
// Variables d'environnement :
//   SEND_DAILY_MAX      — emails max par déclenchement (défaut : 5)
//   SEND_DELAY_MIN_MS   — délai min entre chaque envoi en ms (défaut : 2000)
//   SEND_DELAY_MAX_MS   — délai max entre chaque envoi en ms (défaut : 5000)
//
// RGPD : on ne journalise jamais les adresses email ni les noms d'entreprises.
// ════════════════════════════════════════════════════════════════════════════

import { sendEmail } from '@/lib/mailer';
import { adminDb, FieldValue } from '@/lib/firebase/admin';

const MAX_PER_BATCH  = parseInt(process.env.SEND_DAILY_MAX    || '5',    10);
const DELAY_MIN_MS   = parseInt(process.env.SEND_DELAY_MIN_MS || '2000', 10);
const DELAY_MAX_MS   = parseInt(process.env.SEND_DELAY_MAX_MS || '5000', 10);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelayMs() {
  return Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS) + DELAY_MIN_MS);
}

/**
 * Traite la file d'envoi d'une campagne validée.
 *
 * @param {string} campaignId
 * @param {Object} campaign      — document Firestore déjà lu (pour éviter un double appel)
 * @returns {Promise<{
 *   sent:           number,    — mails envoyés avec succès dans ce batch
 *   errors:         Array<{ name: string, reason: string }>,
 *   remaining:      number,    — mails keep+email encore non envoyés après ce batch
 *   campaignStatus: string,    — nouveau statut de la campagne
 * }>}
 */
export async function processSendQueue(campaignId, campaign) {
  // Travaille sur une copie mutable de l'array companies.
  const companies = (campaign.companies || []).map((c) => ({ ...c }));

  // ── Filtre des entreprises à envoyer ─────────────────────────────────
  // On conserve l'index original pour mettre à jour le bon élément.
  const pending = companies
    .map((c, i) => ({ ...c, _idx: i }))
    .filter((c) => c.decision === 'keep' && c.email && !c.sentAt);

  if (pending.length === 0) {
    // Rien à envoyer : la campagne est peut-être déjà 'done'.
    return { sent: 0, errors: [], remaining: 0, campaignStatus: 'done' };
  }

  const batch  = pending.slice(0, MAX_PER_BATCH);
  const errors = [];
  let   sent   = 0;

  // ── Envoi séquentiel avec délai aléatoire ────────────────────────────
  for (let i = 0; i < batch.length; i++) {
    const company = batch[i];

    try {
      await sendEmail({
        to:      company.email,
        subject: campaign.emailTemplate?.subject || 'Candidature spontanée',
        text:    company.emailBody || campaign.emailTemplate?.body || '',
      });

      // Horodatage local (pour la logique restante) + mise à jour Firestore.
      const now = new Date().toISOString();
      companies[company._idx].sentAt = now;

      // Écriture Firestore : on met à jour l'array complet (Firestore ne gère
      // pas la mise à jour d'un élément d'array par index via dotted notation).
      await adminDb.doc(`campaigns/${campaignId}`).set(
        { companies, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );

      sent++;
    } catch (err) {
      // On collecte l'erreur sans bloquer les entreprises suivantes.
      // On ne logue pas l'adresse email (RGPD).
      errors.push({ name: company.name, reason: err.message });
    }

    // Délai aléatoire entre chaque envoi — sauf après le dernier.
    if (i < batch.length - 1) {
      await sleep(randomDelayMs());
    }
  }

  // ── Calcul du statut final ────────────────────────────────────────────
  // remaining = entreprises keep+email toujours sans sentAt après ce batch.
  const remaining = companies.filter(
    (c) => c.decision === 'keep' && c.email && !c.sentAt
  ).length;

  const campaignStatus = remaining === 0 ? 'done' : 'sending';

  // Mise à jour du statut de la campagne.
  await adminDb.doc(`campaigns/${campaignId}`).set(
    { status: campaignStatus, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );

  return { sent, errors, remaining, campaignStatus };
}
