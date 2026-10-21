// ════════════════════════════════════════════════════════════════════════════
// Suivi d'une candidature, en mots simples. Partagé client et serveur.
//
// La personne note ce qu'elle a fait après l'analyse : envoyée, relancée,
// entretien, réponse négative. Les dates d'envoi et de relance (ms) servent au
// rappel « Pensez à relancer » au bout de 10 jours sans nouvelles.
// ════════════════════════════════════════════════════════════════════════════

export const CANDIDATURE_STATUSES = [
  { id: 'saved',      label: 'Pas encore envoyée', variant: 'amber' },
  { id: 'sent',       label: 'Envoyée',            variant: 'emerald' },
  { id: 'relaunched', label: 'Relancée',           variant: 'teal' },
  { id: 'interview',  label: 'Entretien obtenu',   variant: 'teal' },
  { id: 'rejected',   label: 'Réponse négative',   variant: 'rose' },
];

// 'applying' : ancien statut, lu comme « pas encore envoyée ».
export const VALID_CANDIDATURE_STATUSES = [...CANDIDATURE_STATUSES.map((s) => s.id), 'applying'];

export function statusInfo(id) {
  return CANDIDATURE_STATUSES.find((s) => s.id === (id === 'applying' ? 'saved' : id)) || CANDIDATURE_STATUSES[0];
}

export const RELANCE_JOURS = 10;
const DAY = 24 * 60 * 60 * 1000;

/**
 * Rappel à afficher pour une candidature, ou null.
 * Envoyée depuis 10 jours sans suite → « Pensez à relancer ».
 */
export function relanceReminder(c, now = Date.now()) {
  if (c?.status === 'sent' && c.sentAt && now - c.sentAt >= RELANCE_JOURS * DAY) {
    const j = Math.floor((now - c.sentAt) / DAY);
    return `Envoyée il y a ${j} jours, sans réponse : pensez à relancer.`;
  }
  return null;
}
