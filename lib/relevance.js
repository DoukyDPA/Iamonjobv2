// ════════════════════════════════════════════════════════════════════════════
// PERTINENCE DES OFFRES (commun à France Travail, Adzuna et Jooble)
//
// Constat (octobre 2026, « Médiateur culturel » à Créteil) : la cascade de
// mots-clés finissait sur « Médiateur » seul. France Travail interprète alors ce
// mot comme TOUT le ROME K1204 (médiation sociale), un ROME fourre-tout où des
// recruteurs classent n'importe quoi : alternance commerciale, stage IA chez
// Orange, juriste marchés publics. Ces offres remontaient sans aucun contrôle.
//
// Règle désormais appliquée à toute offre obtenue par mots-clés :
//   - l'intitulé contient au moins une racine distinctive de la requête, OU
//   - l'offre porte le code ROME visé, OU
//   - la description contient TOUTES les racines distinctives (2 au maximum
//     exigées), pas une seule au détour d'une phrase.
// ════════════════════════════════════════════════════════════════════════════

export function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

// Mots passe-partout : présents dans quantité d'intitulés, ils ne prouvent rien.
export const GENERIC_TERMS = new Set([
  'de', 'des', 'du', 'la', 'le', 'les', 'un', 'une', 'en', 'et', 'au', 'aux',
  'pour', 'sur', 'a', 'the', 'of', 'and', 'or', 'avec', 'dans', 'par',
  'h', 'f', 'hf', 'fh', 'cdi', 'cdd', 'stage', 'alternance', 'junior', 'senior',
  'chef', 'cheffe', 'responsable', 'agent', 'agente', 'assistant', 'assistante',
  'charge', 'chargee', 'technicien', 'technicienne', 'operateur', 'operatrice',
  'employe', 'employee', 'manager', 'directeur', 'directrice', 'conseiller',
  'conseillere', 'cadre', 'specialiste', 'gestionnaire', 'coordinateur',
  'coordinatrice', 'projet', 'projets', 'mission', 'missions', 'service',
  'services', 'equipe', 'equipes', 'poste', 'metier', 'adjoint', 'adjointe',
  'ice', 'rice', 'trice', 'euse', 'ere', 'le', 'elle', 'e',
]);

// Racine d'un mot : on retire les suffixes de genre, de nombre et de métier
// (« mediateur », « mediatrice », « mediation » → « medi » ; « culturel »,
// « culture », « culturelle » → « cultur »). On compare ensuite des racines
// ENTIÈRES : « mediatheque » garde sa racine et ne passe plus pour « médiateur ».
const SUFFIXES = [
  'atrices', 'ateurs', 'ations', 'atrice', 'ateur', 'ation',
  'trices', 'teurs', 'trice', 'teur', 'elles', 'elle', 'els', 'el',
  'euses', 'euse', 'eurs', 'eur', 'ieres', 'iere', 'iers', 'ier',
  'es', 'e', 's',
];
function stem(token) {
  for (const suf of SUFFIXES) {
    if (token.endsWith(suf) && token.length - suf.length >= 3) {
      return token.slice(0, -suf.length);
    }
  }
  return token;
}

function stemsOf(text) {
  return new Set(norm(text).split(/[^a-z0-9]+/).filter(Boolean).map(stem));
}

// Racines distinctives d'une requête. On retire d'abord l'écriture inclusive
// (« Médiateur.ice », « culturel·le », « Médiateur / Médiatrice ») pour ne pas
// fabriquer de faux mots.
export function distinctiveStems(keywords) {
  const cleaned = norm(keywords)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[.·•-](ice|rice|trice|euse|ere|e|le|elle|es|s)\b/g, '')
    .replace(/\/\s*\S+/g, ' ');
  return Array.from(new Set(
    cleaned
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 2 && !GENERIC_TERMS.has(t))
      .map(stem)
  ));
}

/**
 * Une offre est retenue si :
 *   - elle porte le code ROME visé, OU
 *   - son intitulé contient une racine distinctive ET l'offre entière (intitulé
 *     + description) en contient au moins deux quand la requête en a deux, OU
 *   - pour une requête à deux racines ou plus, la description les contient
 *     toutes les deux même si l'intitulé est formulé autrement.
 *
 * @param {{ intitule?: string, description?: string, codeRome?: string }} offer
 * @param {string[]} stems - racines distinctives de la requête
 * @param {string|null} [codeRome] - ROME visé, s'il est connu
 */
export function isRelevantOffer(offer, stems, codeRome = null) {
  if (codeRome && offer.codeRome && offer.codeRome === codeRome) return true;
  if (!stems.length) return true; // requête trop générique : rien pour trancher
  const needed = Math.min(stems.length, 2);
  const title = stemsOf(offer.intitule);
  const all = new Set([...title, ...stemsOf(offer.description)]);
  const inTitle = stems.filter((s) => title.has(s)).length;
  const inAll = stems.filter((s) => all.has(s)).length;
  if (inTitle >= 1 && inAll >= needed) return true;
  return stems.length >= 2 && inAll >= needed;
}

// Nombre de racines de la requête présentes dans l'intitulé : sert à classer,
// au sein d'un même code ROME, les offres au titre explicite avant les autres
// (« Comptable » : « Contrôleur comptable » avant « Chargé de facturation »).
export function titleScore(offer, stems) {
  const title = stemsOf(offer.intitule);
  return stems.filter((s) => title.has(s)).length;
}

// ─── Exclusion des stages et des alternances ────────────────────────────────
// Case à cocher côté utilisateur : un candidat de 58 ans n'a que faire des
// stages et contrats d'apprentissage. France Travail marque les alternances
// (champ `alternance`) mais PAS les stages, souvent publiés en « CDI » : on
// les repère donc à l'intitulé et à la mention de convention de stage.

// « Stage », « Stagiaire », « Internship »… mais pas « Coordinateur de stages
// de formation », qui est un vrai poste.
const STAGE_TITLE = /\b(stagiaire|internship|intern)\b|\bstages?\b(?!\s+de\s+formation)/;
const STAGE_DESC = /convention de stage|stage de fin d.etudes|stage de \d+ mois|gratification de stage/;
const ALTERNANCE_TEXT = /\b(alternance|alternant|alternante|apprenti|apprentie|apprentissage|contrat pro|professionnalisation|work[- ]study)\b/;

export function isStageOffer(offer) {
  return STAGE_TITLE.test(norm(offer.intitule)) || STAGE_DESC.test(norm(offer.description));
}

export function isAlternanceOffer(offer) {
  if (offer.alternance === true) return true;
  return ALTERNANCE_TEXT.test(norm(`${offer.intitule} ${offer.typeContrat}`));
}

/**
 * @param {Object} offer
 * @param {{ stage?: boolean, alternance?: boolean, ids?: Set<string> }} [exclude]
 */
export function isExcludedOffer(offer, exclude = {}) {
  // Offres signalées « hors sujet » (exclusion validée ou signalement perso).
  if (exclude.ids && exclude.ids.has(offer.id)) return true;
  if (exclude.stage && isStageOffer(offer)) return true;
  if (exclude.alternance && isAlternanceOffer(offer)) return true;
  return false;
}
