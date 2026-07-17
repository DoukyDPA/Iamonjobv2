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

/**
 * Efface toutes les données d'un compte, puis le compte Auth lui-même.
 *
 * @param {string} uid - identifiant Firebase du compte à effacer.
 * @returns {Promise<{ uid: string, rateLimitsDeleted: number }>}
 */
export async function deleteAccountData(uid) {
  if (!uid) throw new Error('uid requis pour l\'effacement.');

  // 1. Document CV.
  await adminDb.doc(`cvs/${uid}`).delete();

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

  return { uid, rateLimitsDeleted };
}
