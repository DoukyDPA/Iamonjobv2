// ════════════════════════════════════════════════════════════════════════════
// Purge des comptes utilisateurs inactifs.
//
// Objectif produit : IAMONJOB s'adresse aux demandeurs d'emploi qui cherchent
// maintenant. Passé un certain temps sans activité, le compte part. Le message
// est clair, l'outil reste sobre, la base ne garde que des dossiers vivants.
//
// Périmètre : on ne touche JAMAIS un conseiller. Un conseiller porte le custom
// claim role === 'conseiller' (voir /api/admin/promote). Tout compte qui porte
// ce claim est écarté, quelle que soit son activité.
//
// Signal d'activité : les métadonnées Firebase Auth. On retient la date la plus
// récente entre la dernière connexion (lastSignInTime) et le dernier
// rafraîchissement de jeton (lastRefreshTime, mis à jour tant que la personne
// utilise l'app). À défaut, la date de création du compte. Aucun champ à
// stocker, aucune lecture Firestore par utilisateur.
//
// Le système ne conserve pas les emails : impossible de prévenir par courriel
// avant l'effacement. La purge est donc silencieuse, ce que la page
// /confidentialite doit annoncer (durée + suppression automatique).
// ════════════════════════════════════════════════════════════════════════════

import { adminAuth } from '@/lib/firebase/admin';
import { deleteAccountData } from '@/lib/account-deletion';
import { logEvent } from '@/lib/logger';

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

// Garde-fou : jamais moins d'une semaine, même si la variable est mal réglée.
// Évite qu'une valeur à 0 ou négative vide la base d'un coup.
const MIN_DAYS = 7;

/**
 * Nombre de jours d'inactivité au-delà duquel un compte est purgé.
 * Réglable via INACTIVE_ACCOUNT_DAYS. Défaut : 30.
 */
export function inactiveThresholdDays() {
  const raw = Number(process.env.INACTIVE_ACCOUNT_DAYS);
  const days = Number.isFinite(raw) && raw > 0 ? raw : 30;
  return Math.max(days, MIN_DAYS);
}

// Dernière activité connue d'un compte, en millisecondes. On prend le plus récent
// des trois horodatages fournis par Auth. Une valeur illisible vaut 0.
function lastActiveMs(user) {
  const m = user.metadata || {};
  const times = [m.lastSignInTime, m.lastRefreshTime, m.creationTime]
    .map((t) => (t ? Date.parse(t) : 0))
    .filter((n) => Number.isFinite(n));
  return times.length ? Math.max(...times) : 0;
}

/**
 * Parcourt tous les comptes Auth et supprime les utilisateurs (hors conseillers)
 * inactifs depuis plus de `days` jours.
 *
 * @param {Object} opts
 * @param {string} opts.requestId - identifiant de run, pour relier les logs.
 * @param {boolean} [opts.dryRun=false] - si vrai, ne supprime rien : compte et
 *        renvoie seulement ce qui serait effacé. Sert à observer avant d'activer.
 * @returns {Promise<Object>} résumé chiffré du run.
 */
export async function purgeInactiveUsers({ requestId, dryRun = false } = {}) {
  const days = inactiveThresholdDays();
  const cutoff = Date.now() - days * DAY_MS;

  const summary = {
    days,
    dryRun,
    scanned: 0,
    conseillersSkipped: 0,
    matched: 0,
    deleted: 0,
    errors: 0,
  };

  let pageToken;
  do {
    const page = await adminAuth.listUsers(PAGE_SIZE, pageToken);

    for (const user of page.users) {
      summary.scanned += 1;

      // On n'efface jamais un conseiller.
      if (user.customClaims?.role === 'conseiller') {
        summary.conseillersSkipped += 1;
        continue;
      }

      // Compte encore actif dans la fenêtre : on passe.
      if (lastActiveMs(user) > cutoff) continue;

      summary.matched += 1;

      if (dryRun) continue;

      try {
        await deleteAccountData(user.uid);
        summary.deleted += 1;
        // Trace d'audit : uid seul, jamais email ni nom (règle du logger).
        logEvent({
          event: 'purge-inactive-delete',
          requestId,
          uid: user.uid,
          status: 'deleted',
        });
      } catch (err) {
        summary.errors += 1;
        logEvent({
          event: 'purge-inactive-delete',
          requestId,
          uid: user.uid,
          status: 'error',
          error: err.message,
          level: 'error',
        });
      }
    }

    pageToken = page.pageToken;
  } while (pageToken);

  logEvent({ event: 'purge-inactive', requestId, status: 'done', ...summary });
  return summary;
}
