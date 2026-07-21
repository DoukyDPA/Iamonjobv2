// ════════════════════════════════════════════════════════════════════════════
// Limitation de débit (rate limiting) par utilisateur et par route.
//
// Objectif : empêcher qu'un seul compte authentifié vide le quota IA ou la
// facture en enchaînant les requêtes. On compte les appels sur deux fenêtres,
// la minute et le jour.
//
// Le compteur ne vit pas dans Firestore. Chaque appel IA y écrivait un document,
// soit des millions d'écritures par mois à grande échelle, juste pour compter.
// On garde le compte en mémoire du processus. Avec une seule réplique Railway
// (numReplicas = 1), un même usager tombe toujours sur le même processus : le
// compte est exact et coûte zéro.
//
// Note montée en charge : si tu passes un jour à plusieurs répliques, chaque
// réplique aura son propre compteur et un usager pourrait doubler son quota. Il
// faudra alors un compteur partagé (Redis ou équivalent). Tant que tu restes à
// une réplique, ce fichier suffit.
//
// En cas d'erreur interne, on laisse passer (fail-open) : mieux vaut servir
// l'utilisateur que bloquer tout le monde pour un souci technique.
// ════════════════════════════════════════════════════════════════════════════

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Magasin mémoire (par processus).
// clé -> { minuteWindow, minuteCount, dayWindow, dayCount }
const store = new Map();
let sweepTick = 0;

// Purge paresseuse des entrées dont la fenêtre « jour » est expirée. Appelée
// une fois toutes les 500 vérifications, pour garder la Map bornée sans coût.
function sweep(now) {
  for (const [k, v] of store) {
    if (v.dayWindow + DAY_MS < now) store.delete(k);
  }
}

/**
 * Vérifie et incrémente le compteur de l'utilisateur pour une route donnée.
 *
 * @param {Object} opts
 * @param {string} opts.uid       - identifiant utilisateur (Firebase)
 * @param {string} opts.route     - clé de route, ex. 'ai' ou 'france-travail'
 * @param {number} opts.perMinute - nombre max de requêtes par minute
 * @param {number} opts.perDay    - nombre max de requêtes par jour
 * @returns {Promise<{ allowed: boolean, scope?: string, retryAfter?: number,
 *                     remainingMinute?: number, remainingDay?: number }>}
 */
export async function enforceRateLimit({ uid, route, perMinute, perDay }) {
  if (!uid) return { allowed: true }; // garde-fou : pas d'uid => on ne bloque pas ici

  const now = Date.now();
  const minuteWindow = now - (now % MINUTE_MS);
  const dayWindow = now - (now % DAY_MS);
  const key = `${route}__${uid}`;

  try {
    const cur = store.get(key);
    const minuteCount = cur && cur.minuteWindow === minuteWindow ? cur.minuteCount : 0;
    const dayCount = cur && cur.dayWindow === dayWindow ? cur.dayCount : 0;

    if (minuteCount >= perMinute) {
      return {
        allowed: false,
        scope: 'minute',
        retryAfter: Math.ceil((minuteWindow + MINUTE_MS - now) / 1000),
      };
    }
    if (dayCount >= perDay) {
      return {
        allowed: false,
        scope: 'day',
        retryAfter: Math.ceil((dayWindow + DAY_MS - now) / 1000),
      };
    }

    store.set(key, {
      minuteWindow,
      minuteCount: minuteCount + 1,
      dayWindow,
      dayCount: dayCount + 1,
    });
    if (++sweepTick % 500 === 0) sweep(now);

    return {
      allowed: true,
      remainingMinute: perMinute - (minuteCount + 1),
      remainingDay: perDay - (dayCount + 1),
    };
  } catch (err) {
    // Fail-open : on ne bloque pas l'utilisateur pour un problème technique.
    console.warn(`[rate-limit] échec sur ${key}, on laisse passer :`, err.message);
    return { allowed: true, degraded: true };
  }
}
