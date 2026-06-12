// ════════════════════════════════════════════════════════════════════════════
// Journalisation structurée (logs JSON).
//
// Objectif : pouvoir répondre à « qui a fait quoi, quand » en cas d'abus, de
// litige ou de demande RGPD. Chaque ligne est un objet JSON, donc filtrable et
// agrégeable par n'importe quel outil de logs (Railway, Logtail, Axiom…).
//
// RÈGLE D'OR : jamais de donnée personnelle ici. On journalise l'`uid`, jamais
// l'email, le nom, le texte du CV ou les mots-clés de recherche. Un `uid` seul
// ne dit rien sans accès à la base, contrairement à un email.
// ════════════════════════════════════════════════════════════════════════════

import { randomUUID } from 'crypto';

// Identifiant unique d'une requête, pour relier entre eux les événements d'un
// même appel (début, fin, erreur).
export function newRequestId() {
  try {
    return randomUUID();
  } catch {
    return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

/**
 * Écrit une ligne de log structurée.
 * @param {Object} evt - champs libres (requestId, uid, action, status, durationMs…)
 */
export function logEvent(evt = {}) {
  const line = { ts: new Date().toISOString(), ...evt };
  // On choisit le flux selon la gravité : error pour les échecs, log sinon.
  const out = evt.level === 'error' ? console.error : console.log;
  try {
    out(JSON.stringify(line));
  } catch {
    out(`[log] ${evt.event || 'event'} status=${evt.status || '?'}`);
  }
}
