// Situation à la sortie de l'accompagnement, renseignée par le conseiller.
// Sert au bilan pour les financeurs. Partagé client et serveur.

export const SITUATIONS_SORTIE = [
  { id: 'emploi-durable', label: 'Emploi durable (CDI, CDD de 6 mois et plus)' },
  { id: 'emploi-transition', label: 'Emploi de transition (CDD court, intérim, contrat aidé)' },
  { id: 'formation', label: 'Formation qualifiante' },
  { id: 'creation', label: "Création ou reprise d'entreprise" },
  { id: 'recherche', label: 'Toujours en recherche' },
  { id: 'autre', label: 'Autre (déménagement, santé, abandon…)' },
];

export const SORTIE_IDS = SITUATIONS_SORTIE.map((s) => s.id);
export const sortieLabel = (id) => SITUATIONS_SORTIE.find((s) => s.id === id)?.label || '';
// Sorties dites « positives » dans la plupart des conventions de financement.
export const SORTIES_POSITIVES = ['emploi-durable', 'emploi-transition', 'formation', 'creation'];
