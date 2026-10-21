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

// Normalise un code saisi. On accepte ce que tape réellement une personne :
// minuscules, espaces, tirets oubliés ou remplacés par des points (« ac 2026
// 016 ywgh », « AC2026016YWGH »). On reconstruit la forme canonique
// AC-AAAA-NNN-XXXX. Le suffixe compte toujours 4 caractères, ce qui lève
// l'ambiguïté avec le numéro séquentiel (3 chiffres ou plus). Dans les parties
// numériques, un O tapé pour un zéro ou un I/L pour un 1 est corrigé.
export function normalizeCode(code) {
  const raw = String(code || '').trim().toUpperCase();
  const compact = raw.replace(/[^A-Z0-9]/g, '');
  const m = /^AC([0-9OIL]{4})([A-Z0-9]+)$/.exec(compact);
  if (!m) return raw;
  const digits = (s) => s.replace(/O/g, '0').replace(/[IL]/g, '1');
  const year = digits(m[1]);
  const rest = m[2];
  let seq = rest;
  let suffix = '';
  if (rest.length >= 7) {
    seq = rest.slice(0, -4);
    suffix = rest.slice(-4);
  }
  seq = digits(seq);
  if (!/^\d{4}$/.test(year) || !/^\d{3,}$/.test(seq)) return raw;
  return `AC-${year}-${seq}${suffix ? `-${suffix}` : ''}`;
}

// Traduit un code en adresse email interne.
export function codeToEmail(code) {
  return `${normalizeCode(code).toLowerCase()}@${BENEFICIAIRE_EMAIL_DOMAIN}`;
}

// Vérifie qu'un code a une forme plausible avant tout appel réseau.
export function isPlausibleCode(code) {
  return /^AC-\d{4}-\d{3,}(-[A-Z0-9]{4})?$/.test(normalizeCode(code));
}
