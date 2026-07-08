// ════════════════════════════════════════════════════════════════════════════
// Liste d'autorisation des conseillers.
//
// Deux façons d'autoriser un conseiller, cumulables, définies par variables
// d'environnement (pas d'écran d'admin pour l'instant, on gère à la main) :
//
//   CONSEILLER_EMAILS    liste d'emails autorisés, séparés par des virgules
//   CONSEILLER_DOMAINS   liste de domaines autorisés (« cbe-sud94.org, … ») :
//                        toute adresse sur l'un de ces domaines est conseiller
//
// La structure posée sur le compte vient de CONSEILLER_DEFAULT_STRUCTURE, sinon
// « default ». On garde ça simple : une structure unique au démarrage.
// ════════════════════════════════════════════════════════════════════════════

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Un email est autorisé s'il figure dans la liste, ou si son domaine y figure.
export function isConseillerAllowed(email) {
  const e = String(email || '').trim().toLowerCase();
  if (!e || !e.includes('@')) return false;

  const emails = parseList(process.env.CONSEILLER_EMAILS);
  if (emails.includes(e)) return true;

  const domains = parseList(process.env.CONSEILLER_DOMAINS);
  const domain = e.slice(e.lastIndexOf('@') + 1);
  return domains.includes(domain);
}

export function conseillerStructureId() {
  return process.env.CONSEILLER_DEFAULT_STRUCTURE || 'default';
}
