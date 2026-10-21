// ════════════════════════════════════════════════════════════════════════════
// Effacement d'un compte utilisateur — logique partagée.
//
// Un seul endroit décrit CE QU'ON efface quand un compte disparaît. Deux
// appelants s'en servent, avec un comportement strictement identique :
//   - /api/account/delete       : l'utilisateur supprime son compte lui-même.
//   - /api/admin/purge-inactive  : purge automatique des comptes inactifs.
//
// Ordre : données applicatives d'abord, compte Auth ensuite. Un delete sur un
// document absent ne lève rien côté Admin SDK, donc l'absence n'est pas une
// erreur. Action irréversible (RGPD, article 17).
// ════════════════════════════════════════════════════════════════════════════

import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { deleteIamoncvData } from '@/lib/iamoncv-store';
import { getBeneficiaireByAuthUid, purgeBeneficiaire } from '@/lib/beneficiaires';

// Supprime tous les documents d'une collection portant cet uid, par paquets.
async function deleteAllWhereUid(collection, uid) {
  let total = 0;
  for (;;) {
    const snap = await adminDb.collection(collection).where('uid', '==', uid).limit(300).get();
    if (snap.empty) return total;
    const batch = adminDb.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    total += snap.size;
    if (snap.size < 300) return total;
  }
}

/**
 * Efface toutes les données d'un compte, puis le compte Auth lui-même.
 *
 * @param {string} uid - identifiant Firebase du compte à effacer.
 * @param {Object} [opts]
 * @param {boolean} [opts.purgeDossier=false] - vrai quand la personne supprime
 *   elle-même son compte : son dossier d'accompagnement part aussi. La purge
 *   automatique des comptes inactifs, elle, laisse le dossier au conseiller.
 * @returns {Promise<{ uid: string, rateLimitsDeleted: number, candidaturesDeleted: number, campaignsDeleted: number, dossierPurged: boolean }>}
 */
export async function deleteAccountData(uid, { purgeDossier = false } = {}) {
  if (!uid) throw new Error('uid requis pour l\'effacement.');

  // 0. Personne accompagnée : on efface tout son dossier (avis demandés,
  //    réponses aux questionnaires, envois du conseiller, suivi d'usage, puis
  //    candidatures, campagnes, CV et IAMONCV). Même logique que la purge
  //    déclenchée par le conseiller, pour qu'aucune donnée ne survive.
  const ben = purgeDossier ? await getBeneficiaireByAuthUid(uid) : null;
  if (ben) await purgeBeneficiaire(ben.id);

  // 1. Document CV, candidatures et campagnes de candidatures spontanées.
  //    (Déjà faits pour une personne accompagnée ; sans effet dans ce cas.)
  await adminDb.doc(`cvs/${uid}`).delete();
  const candidaturesDeleted = await deleteAllWhereUid('candidatures', uid);
  const campaignsDeleted = await deleteAllWhereUid('campaigns', uid);

  // 1 bis. Espace IAMONCV (profils et CV enregistrés sur le compte).
  await deleteIamoncvData(uid);

  // 2. Compteurs de rate limit. On ne devine pas les clés de route : on retrouve
  //    tous les documents portant cet uid (rate_limits/{route}__{uid}) et on les
  //    supprime, quelle que soit la route (ai, france-travail, campaign, send…).
  let rateLimitsDeleted = 0;
  const rlSnap = await adminDb
    .collection('rate_limits')
    .where('uid', '==', uid)
    .get();
  await Promise.all(
    rlSnap.docs.map((d) => {
      rateLimitsDeleted += 1;
      return d.ref.delete();
    })
  );

  // 3. Compte d'authentification. Invalide aussi les sessions en cours.
  await adminAuth.deleteUser(uid);

  return { uid, rateLimitsDeleted, candidaturesDeleted, campaignsDeleted, dossierPurged: Boolean(ben) };
}
