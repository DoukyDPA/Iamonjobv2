// ════════════════════════════════════════════════════════════════════════════
// Limitation de débit (rate limiting) par utilisateur et par route.
//
// Objectif : empêcher qu'un seul compte authentifié vide le quota IA ou la
// facture en enchaînant les requêtes. On compte les appels sur deux fenêtres
// (la minute et le jour) dans un même document Firestore, mis à jour de façon
// atomique via une transaction.
//
// Document : rate_limits/{route}__{uid}
//   { route, uid, minuteWindow, minuteCount, dayWindow, dayCount, updatedAt }
//
// En cas d'échec Firestore, on laisse passer (fail-open) : on préfère servir
// l'utilisateur plutôt que de bloquer tout le monde pour un souci interne.
// L'incident est tout de même journalisé.
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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
  const ref = adminDb.doc(`rate_limits/${route}__${uid}`);

  try {
    return await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const d = snap.exists ? snap.data() : {};

      const minuteCount = d.minuteWindow === minuteWindow ? d.minuteCount || 0 : 0;
      const dayCount = d.dayWindow === dayWindow ? d.dayCount || 0 : 0;

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

      tx.set(
        ref,
        {
          route,
          uid,
          minuteWindow,
          minuteCount: minuteCount + 1,
          dayWindow,
          dayCount: dayCount + 1,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        allowed: true,
        remainingMinute: perMinute - (minuteCount + 1),
        remainingDay: perDay - (dayCount + 1),
      };
    });
  } catch (err) {
    // Fail-open : on ne bloque pas l'utilisateur pour un problème d'infra.
    console.warn(`[rate-limit] échec sur ${route}__${uid}, on laisse passer :`, err.message);
    return { allowed: true, degraded: true };
  }
}
