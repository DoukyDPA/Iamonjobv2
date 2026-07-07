// ════════════════════════════════════════════════════════════════════════════
// Validation des sorties IA.
//
// Un LLM peut renvoyer un JSON syntaxiquement correct mais incomplet ou de la
// mauvaise forme (champ manquant, tableau attendu reçu comme texte…). Sans
// garde-fou, ça casse l'affichage côté client ou écrit des données bancales en
// base. Ici, on vérifie que la réponse a bien la STRUCTURE attendue pour chaque
// action, avant de la renvoyer. Validation volontairement légère : on contrôle
// les clés et types de premier niveau, pas chaque sous-champ.
// ════════════════════════════════════════════════════════════════════════════

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isArr = (v) => Array.isArray(v);
const isStr = (v) => typeof v === 'string';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// Un validateur par action. Retourne true si la forme est correcte.
// Les actions non listées (ex. cover_letter, qui renvoie du texte brut) ne sont
// pas validées ici.
const VALIDATORS = {
  rate_cv: (r) =>
    isObj(r) && isNum(r.score) && isArr(r.criteria) &&
    isArr(r.strengths) && isArr(r.improvements),

  analyze_cv: (r) =>
    isObj(r) && isObj(r.skills) && isArr(r.skills.categories) &&
    isObj(r.suggestions) && isArr(r.suggestions.proches) &&
    isArr(r.suggestions.logiques) && isArr(r.suggestions.eloignes),

  // Le rapport est le cœur de l'enquête métier. Le message d'accueil est
  // secondaire : s'il manque (JSON tronqué sur un appel lourd), le client met un
  // texte par défaut plutôt que de tout faire échouer. On ne bloque donc que si
  // le rapport lui-même est absent.
  discover_job: (r) => isObj(r) && isObj(r.report),

  job_chat: (r) => isObj(r) && isStr(r.reply),

  analyze_compatibility: (r) =>
    isObj(r) && isNum(r.score) && isArr(r.forces) &&
    isArr(r.faiblesses) && isStr(r.conseilGlobal),

  interview_prep: (r) => isObj(r) && isArr(r.questions),

  action_plan: (r) => isObj(r) && isArr(r.plan),
};

/**
 * Valide la sortie d'une action IA.
 * @returns {{ ok: boolean }}
 */
export function validateAIResult(action, result) {
  const check = VALIDATORS[action];
  if (!check) return { ok: true }; // pas de schéma défini = on laisse passer
  return { ok: Boolean(check(result)) };
}
