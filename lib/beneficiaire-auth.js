// ════════════════════════════════════════════════════════════════════════════
// Authentification bénéficiaire par code.
//
// Le bénéficiaire ne connaît qu'un code (AC-2026-001-K7QD). En interne, ce code
// devient une adresse email fictive, sur laquelle repose l'authentification
// Firebase email/mot de passe. L'adresse n'est jamais montrée ni utilisée pour
// écrire à la personne. Ce module est partagé client et serveur : fonctions
// pures, aucune dépendance serveur.
// ════════════════════════════════════════════════════════════════════════════

export const BENEFICIAIRE_EMAIL_DOMAIN = 'iamonjob.local';

// Normalise un code saisi (espaces, casse). Le format attendu ne contient que
// des lettres, chiffres et tirets, tous valides dans une partie locale d'email.
export function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

// Traduit un code en adresse email interne.
export function codeToEmail(code) {
  return `${normalizeCode(code).toLowerCase()}@${BENEFICIAIRE_EMAIL_DOMAIN}`;
}

// Vérifie qu'un code a une forme plausible avant tout appel réseau.
export function isPlausibleCode(code) {
  return /^AC-\d{4}-\d{3}(-[A-Z0-9]{4})?$/.test(normalizeCode(code));
}
