import { fetchWithTimeout } from '@/lib/http';
import { callAI } from '@/lib/ai/index';

// L'URL d'auth officielle pour LBB v2 selon le spec OpenAPI
const AUTH_URL =
  'https://authentification-partenaire.francetravail.io/connexion/oauth2/access_token?realm=/partenaire';
const SEARCH_URL =
  'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';
const LBB_URL =
  'https://api.francetravail.io/partenaire/labonneboite/v2/recherche';

// Cache multi-scope : chaque scope (ou combinaison de scopes) a son propre token.
// Clé = chaîne de scopes, valeur = { token, expiresAt }.
const tokenCache = new Map();

async function getAccessToken(scope) {
  const now = Date.now();
  const cached = tokenCache.get(scope);
  if (cached && now < cached.expiresAt) return cached.token;

  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET non configurés.');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', scope);

  const res = await fetchWithTimeout(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Authentification France Travail refusée (${res.status}). ${detail}`);
  }

  const data = await res.json();
  tokenCache.set(scope, {
    token: data.access_token,
    expiresAt: now + (data.expires_in - 60) * 1000,
  });
  return data.access_token;
}

// ─── Fiche métier ROME 4.0 (référentiel officiel) ──────────────────────────
// Matière première de l'enquête métier : compétences, savoir-faire, savoir-être
// et savoirs officiels d'un code ROME. L'IA la reformule ensuite en contenu
// vivant (action discover_job), au lieu de tout inventer.
const ROME_FICHE_URL =
  'https://api.francetravail.io/partenaire/rome-fiches-metiers/v1/fiches-rome/fiche-metier';
// Scope à confirmer au premier appel : si l'auth renvoie 400, ajuster ici
// (variante connue : 'api_rome-fiches-metiersv1 nomenclatureRome').
const ROME_FICHE_SCOPE =
  process.env.FRANCE_TRAVAIL_ROME_FICHE_SCOPE || 'api_rome-fiches-metiersv1';

// Cache mémoire des fiches par code ROME (le référentiel bouge peu, ~1 version/an).
// Évite de retaper l'API à chaque message du chat : la fiche est chargée une fois
// à la découverte, puis réutilisée pour la conversation. TTL 1 h.
const ficheCache = new Map();
const FICHE_TTL_MS = 60 * 60 * 1000;

// Récupère tous les libellés d'un sous-arbre (structure oneOf variable côté API).
function collectLibelles(node, out = []) {
  if (!node) return out;
  if (Array.isArray(node)) {
    node.forEach((n) => collectLibelles(n, out));
    return out;
  }
  if (typeof node === 'object') {
    if (typeof node.libelle === 'string' && node.libelle.trim()) out.push(node.libelle.trim());
    for (const v of Object.values(node)) collectLibelles(v, out);
  }
  return out;
}

/**
 * Fiche métier officielle d'un code ROME, résumée pour alimenter l'IA.
 * Lève en cas d'indisponibilité : l'appelant décide du repli (non bloquant).
 *
 * @param {string} codeRome ex. "A1201"
 * @returns {Promise<{ libelle: string, competences: string[], savoirs: string[] }>}
 */
export async function fetchFicheRome(codeRome) {
  if (!codeRome || !/^[A-Z]\d{4}$/i.test(codeRome)) {
    throw new Error('Code ROME invalide.');
  }
  const key = codeRome.toUpperCase();

  const cached = ficheCache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const token = await getAccessToken(ROME_FICHE_SCOPE);
  const res = await fetchWithTimeout(
    `${ROME_FICHE_URL}/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } }
  );
  if (!res.ok) throw new Error(`ROME fiche ${res.status}`);

  const fiche = await res.json();
  const value = {
    libelle: fiche.metier?.libelle || '',
    competences: [...new Set(collectLibelles(fiche.groupesCompetencesMobilisees))],
    savoirs: [...new Set(collectLibelles(fiche.groupesSavoirs))],
  };
  ficheCache.set(key, { value, expiresAt: Date.now() + FICHE_TTL_MS });
  return value;
}

// Mots-fonctions génériques qui n'ont pas de sens seuls pour une recherche d'emploi.
// Si le titre commence par l'un d'eux, on garde aussi le mot métier qui suit.
const GENERIC_PREFIXES = new Set([
  'assistant', 'assistante', 'apprenti', 'apprentie',
  'chargé', 'chargée', 'responsable', 'directeur', 'directrice',
  'manager', 'chef', 'coordinateur', 'coordinatrice',
  'adjoint', 'adjointe', 'technicien', 'technicienne',
  'conseiller', 'conseillère', 'agent', 'stagiaire',
  'spécialiste', 'expert', 'experte', 'ingénieur', 'ingénieure',
  'opérateur', 'opératrice', 'animateur', 'animatrice',
]);

// Génère une cascade de variantes de recherche à partir d'un titre de métier.
// Ordre : du plus spécifique au plus générique, en priorisant le domaine sur le rôle.
// Ex: "Chef de projet Accompagnement au changement" → ["Chef de projet Accompagnement au changement", "Chef projet Accompagnement changement", "Accompagnement changement", "Chef projet", "Accompagnement"]
// Ex: "Assistant Coiffeur" → ["Assistant Coiffeur", "Coiffeur"]
function searchVariants(title) {
  // 1. Supprime tout ce qui est entre parenthèses
  let base = title.replace(/\([^)]*\)/g, ' ').trim();
  // 2. Supprime les variantes genre/rôle après "/" collé : "Vendeur/Vendeuse" → "Vendeur"
  base = base.replace(/\/[^\s,]+/g, '').replace(/\s+/g, ' ').trim();

  // 3. Variante simplifiée : retire mots de liaison et qualificatifs de niveau
  const simplified = base
    .replace(/\b(en|de|d'|du|des|le|la|les|au|aux|pour|par|et|un|une|à|spécialisé|spécialisée|confirmé|confirmée|junior|senior|polyvalent|polyvalente)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = simplified.split(' ').filter((w) => w.length > 0);
  const firstWord = words[0]?.toLowerCase();
  const isGenericFirst = GENERIC_PREFIXES.has(firstWord);

  // 4. Si le 1er mot est générique (Chef, Assistant, Responsable…) ET qu'il y a un domaine derrière :
  //    extraire la partie domaine (mots après le 1er) et la mettre AVANT le rôle court.
  //    "Chef projet Accompagnement changement" → domaine = "Accompagnement changement" (2 derniers mots)
  const domainWords = isGenericFirst && words.length > 2 ? words.slice(1) : null;
  const domainShort = domainWords ? domainWords.slice(-2).join(' ') : null;
  const domainFirst = domainWords ? domainWords[0] : null;

  // 5. Rôle court : 2 premiers mots (ex: "Chef projet")
  const shortRole = words.slice(0, 2).join(' ');

  // 6. Fallback ultime : 2e mot si 1er est générique, sinon 1er mot
  const fallback = isGenericFirst && words[1] ? words[1] : words[0];

  // Cascade : spécifique → domaine → rôle → générique
  return [...new Set([base, simplified, domainShort, shortRole, domainFirst, fallback])]
    .filter((v) => v && v.length > 2);
}

// Applique la localisation (code postal → commune, département → departement).
function applyLocation(query, location) {
  if (!location) return;
  const loc = location.trim();
  if (/^\d{5}$/.test(loc)) query.set('commune', loc);
  else if (/^\d{2,3}$/.test(loc)) query.set('departement', loc);
}

// Normalise une offre France Travail vers le format interne, avec sa source.
// Le champ `source` prépare l'agrégation multi-plateformes (lot suivant).
function mapOffer(offer) {
  return {
    id: offer.id,
    intitule: offer.intitule,
    entreprise: offer.entreprise?.nom || 'Entreprise non divulguée',
    lieu: offer.lieuTravail?.libelle || 'Non spécifié',
    typeContrat: offer.typeContrat || 'Non spécifié',
    description: offer.description || 'Aucune description fournie.',
    competencesRequises: (offer.competences || []).map((c) => c.libelle),
    salaire: offer.salaire?.libelle || 'Salaire non précisé',
    url: offer.origineOffre?.urlOrigine || null,
    source: 'France Travail',
  };
}

// Interroge l'API Offres. `params` porte soit motsCles, soit codeROME.
async function fetchOffers(token, params, location, limit) {
  const query = new URLSearchParams({ sort: '1', range: `0-${limit - 1}`, ...params });
  applyLocation(query, location);

  const res = await fetchWithTimeout(`${SEARCH_URL}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (res.status === 204) return [];
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('[FranceTravail] Erreur', res.status, detail);
    throw new Error(`Erreur recherche France Travail (${res.status}).`);
  }

  const data = await res.json();
  return data.resultats || [];
}

/**
 * Recherche d'offres. Le code ROME est la clé prioritaire : il vient de ROMEO
 * (source officielle) et cible la même taxonomie que La Bonne Boîte, donc offres
 * et entreprises parlent le même langage. Si aucun ROME n'est fourni ou qu'il ne
 * remonte rien, on retombe sur la cascade de mots-clés.
 *
 * @param {Object} opts
 * @param {string} [opts.keywords]  - intitulé libre (repli)
 * @param {string} [opts.codeRome]  - code ROME famille (ex. "H1502"), clé unifiée
 * @param {string} [opts.location]  - code postal ou département
 * @param {number} [opts.limit=5]
 */
export async function searchOffers({ keywords, codeRome, location, limit = 5 }) {
  const token = await getAccessToken('api_offresdemploiv2 o2dsoffre');

  // On ne journalise ni les mots-clés ni le code ROME : ils révèlent le projet
  // professionnel de l'utilisateur (donnée personnelle).

  // 1. Clé unifiée : recherche par code ROME (précise, taxonomie officielle).
  //    On isole cet essai : une erreur éventuelle ne doit pas empêcher le repli.
  if (codeRome && /^[A-Z]\d{4}$/.test(codeRome.trim())) {
    try {
      const parRome = await fetchOffers(token, { codeROME: codeRome.trim() }, location, limit);
      if (parRome.length > 0) return parRome.slice(0, limit).map(mapOffer);
    } catch (err) {
      console.warn('[FranceTravail] Recherche par ROME en échec, repli mots-clés :', err.message);
    }
  }

  // 2. Repli : cascade de variantes de mots-clés.
  if (keywords) {
    for (const variant of searchVariants(keywords)) {
      const resultats = await fetchOffers(token, { motsCles: variant }, location, limit);
      if (resultats.length > 0) return resultats.slice(0, limit).map(mapOffer);
    }
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// ROME — Conversion intitulé libre → code(s) ROME
//
// Deux sources, dans l'ordre :
//   1. ROMEO 2.0 (France Travail) : moteur officiel de rapprochement texte libre
//      → métier ROME, avec un score de prédiction. C'est la source de vérité.
//   2. Repli IA (Gemini) : conserve l'ancien comportement si ROMEO échoue, si le
//      scope n'est pas provisionné, ou si aucun résultat n'atteint le seuil.
//
// Le code ROME sert de clé à La Bonne Boîte (entreprises) et, à terme, aux
// offres et au salaire. Un code fiable sécurise donc toute la chaîne.
// ─────────────────────────────────────────────────────────────────────────────

const ROMEO_URL =
  'https://api.francetravail.io/partenaire/romeo/v2/predictionMetiers';
// Scope ROMEO 2.0. Ajustable sans redéploiement si France Travail le renomme.
const ROMEO_SCOPE = process.env.FRANCE_TRAVAIL_ROMEO_SCOPE || 'api_romeov2';
// Score minimal de prédiction en dessous duquel on ignore le résultat.
const ROMEO_MIN_SCORE = parseFloat(process.env.FRANCE_TRAVAIL_ROMEO_MIN_SCORE || '0.4');

// Normalisation des suggestions CV : deux paliers de confiance.
//   - En dessous de ATTACH, le match est trop faible : on garde l'intitulé de
//     l'IA et AUCUN code ROME (mieux vaut pas de code qu'un mauvais code, qui
//     pollue ensuite offres, entreprises et salaire).
//   - Au-dessus de RENAME, le match est sûr : on peut afficher l'appellation
//     ROME officielle à la place de l'intitulé IA.
//   - Entre les deux : on garde l'intitulé IA mais on rattache le code ROME.
const ROMEO_ATTACH_SCORE = parseFloat(process.env.FRANCE_TRAVAIL_ROMEO_ATTACH_SCORE || '0.5');
const ROMEO_RENAME_SCORE = parseFloat(process.env.FRANCE_TRAVAIL_ROMEO_RENAME_SCORE || '0.7');

/**
 * Prédit les codes ROME d'un intitulé via l'API ROMEO 2.0 (source officielle).
 * Renvoie [] si aucun résultat fiable. Lève une erreur si l'appel échoue
 * (auth, scope manquant, réseau) pour laisser l'orchestrateur décider du repli.
 *
 * @param {string} label
 * @param {number} limit
 * @returns {Promise<Array<{ codeRome: string, libelle: string, score: number }>>}
 */
/**
 * Appel bas niveau à ROMEO /predictionMetiers. Accepte jusqu'à 20 appellations
 * par requête, ce qui permet de normaliser les 9 métiers du CV en un seul appel.
 *
 * @param {Array<{ intitule: string, identifiant: string, contexte?: string }>} appellations
 * @param {Object} [options]
 * @param {number} [options.nbResultats=3]
 * @param {number} [options.seuil=ROMEO_MIN_SCORE]
 * @returns {Promise<Array>} réponse brute ROMEO (un objet par appellation)
 */
async function romeoPredict(appellations, { nbResultats = 3, seuil = ROMEO_MIN_SCORE } = {}) {
  const token = await getAccessToken(ROMEO_SCOPE);

  const payload = {
    appellations,
    options: { nomAppelant: 'iamonjob', nbResultats, seuilScorePrediction: seuil },
  };

  const res = await fetchWithTimeout(ROMEO_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      Accept: 'application/json; charset=utf-8, application/json',
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 204) return [];
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`ROMEO ${res.status} ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function getRomeViaRomeo(label, limit = 3) {
  const data = await romeoPredict(
    [{ intitule: label, identifiant: '1', contexte: '' }],
    { nbResultats: Math.max(limit, 3) }
  );

  const metiers = data[0]?.metiersRome ?? data[0]?.metiers ?? [];

  return metiers
    .map((m) => ({
      codeRome: m.codeRome ?? m.code ?? '',
      libelle: m.libelleRome ?? m.libelleAppellation ?? m.libelle ?? '',
      score: Number(m.scorePrediction ?? m.score ?? 0),
    }))
    .filter((m) => m.codeRome && m.score >= ROMEO_MIN_SCORE)
    .slice(0, limit);
}

/**
 * Cale chaque métier suggéré (analyse CV) sur l'appellation ROME officielle, en
 * un seul appel ROMEO groupé. On force l'appellation la plus proche (seuil bas)
 * pour garantir que TOUS les métiers proposés soient ROME-conformes : ainsi la
 * même clé ROME sert ensuite aux offres, aux entreprises et au salaire.
 *
 * En cas d'indisponibilité de ROMEO, on renvoie les suggestions inchangées :
 * l'application continue de fonctionner, avec repli mots-clés en aval.
 *
 * @param {Object} suggestions - { proches: [], logiques: [], eloignes: [] }
 * @returns {Promise<Object>} mêmes suggestions, chaque métier enrichi de
 *   { title (appellation officielle), codeRome, romeLibelle, titleOriginal }
 */
export async function normalizeSuggestionsToRome(suggestions) {
  if (!suggestions || typeof suggestions !== 'object') return suggestions;

  const CATS = ['proches', 'logiques', 'eloignes'];
  const appellations = [];
  for (const cat of CATS) {
    const list = Array.isArray(suggestions[cat]) ? suggestions[cat] : [];
    list.forEach((job, i) => {
      if (job?.title) {
        appellations.push({ intitule: job.title, identifiant: `${cat}-${i}`, contexte: '' });
      }
    });
  }
  if (appellations.length === 0) return suggestions;

  let data;
  try {
    // Seuil bas volontaire : on veut l'appellation la plus proche, même moyenne.
    data = await romeoPredict(appellations, { nbResultats: 1, seuil: 0.1 });
  } catch (err) {
    console.warn('[ROME] Normalisation des suggestions indisponible, intitulés IA conservés :', err.message);
    return suggestions;
  }

  const byId = new Map();
  for (const item of data) {
    const best = item?.metiersRome?.[0];
    if (item?.identifiant && best?.codeRome) byId.set(item.identifiant, best);
  }

  const out = { ...suggestions };
  for (const cat of CATS) {
    if (!Array.isArray(suggestions[cat])) continue;
    out[cat] = suggestions[cat].map((job, i) => {
      const best = byId.get(`${cat}-${i}`);
      if (!best) return job; // ROMEO n'a rien renvoyé : on garde l'intitulé IA.

      const score = Number(best.scorePrediction ?? best.score ?? 0);

      // Match trop faible : on ne rattache RIEN. C'est le cas « Chef de projet
      // RSE » → « Médecin chef » : mieux vaut garder l'intitulé de l'IA et laisser
      // la recherche retomber sur les mots-clés que caler un mauvais code ROME.
      if (score < ROMEO_ATTACH_SCORE) return job;

      // Match sûr : on affiche l'appellation ROME officielle. Sinon on garde
      // l'intitulé de l'IA, mais on rattache tout de même le code (bonne famille).
      const useRomeTitle = score >= ROMEO_RENAME_SCORE && best.libelleAppellation;
      return {
        ...job,
        title: useRomeTitle ? best.libelleAppellation : job.title,
        titleOriginal: job.title,
        codeRome: best.codeRome,
        romeLibelle: best.libelleRome || '',
        romeScore: score,
      };
    });
  }
  return out;
}

/**
 * Repli IA : estime les codes ROME via Gemini. Moins fiable que ROMEO
 * (peut halluciner un code), mais garantit un résultat si ROMEO indisponible.
 *
 * @param {string} label
 * @param {number} limit
 * @returns {Promise<Array<{ codeRome: string, libelle: string }>>}
 */
async function getRomeViaAI(label, limit = 3) {
  const safeLabel = label.replace(/[`\r\n]+/g, ' ').trim().slice(0, 200);

  const systemInstruction = `Tu es un expert du ROME 4.0 (Répertoire Opérationnel des Métiers et des Emplois de France Travail).
À partir d'un intitulé de métier en texte libre, tu identifies les codes ROME 4.0 les plus pertinents.
Réponds UNIQUEMENT au format JSON : un tableau de ${limit} objets maximum, du plus pertinent au moins pertinent.
Structure exacte : [{ "codeRome": "X0000", "libelle": "Libellé officiel ROME" }]
Si l'intitulé ne correspond à aucun métier connu, renvoie [].`;

  const prompt = `Intitulé de métier : "${safeLabel}"\nIdentifie le ou les codes ROME 4.0 correspondants.`;

  const result = await callAI({
    provider: 'mistral',
    task: 'default',
    systemInstruction,
    prompt,
    isJson: true,
  });
  const items = Array.isArray(result) ? result : [];
  return items.slice(0, limit).map((m) => ({
    codeRome: m.codeRome ?? m.code ?? '',
    libelle:  m.libelle ?? m.libelleRome ?? '',
  }));
}

/**
 * Orchestrateur : ROMEO d'abord, repli IA ensuite.
 * Signature et format de sortie inchangés (compatibilité route/UI).
 *
 * @param {string} label - ex. "développeur web", "infirmière", "chef de projet"
 * @param {number} limit - nombre de résultats max (défaut 3)
 * @returns {Promise<Array<{ codeRome: string, libelle: string, source?: string }>>}
 */
export async function getRomeFromLabel(label, limit = 3) {
  if (!label || !label.trim()) return [];

  // 1. Source officielle ROMEO.
  try {
    const viaRomeo = await getRomeViaRomeo(label.trim(), limit);
    if (viaRomeo.length > 0) {
      return viaRomeo.map((m) => ({
        codeRome: m.codeRome,
        libelle: m.libelle,
        source: 'romeo',
      }));
    }
    // ROMEO a répondu sans résultat fiable : on tente quand même l'IA.
    console.warn('[ROME] ROMEO sans résultat fiable, repli IA.');
  } catch (err) {
    // Scope manquant, auth, réseau : on bascule sur l'IA sans casser le parcours.
    console.warn('[ROME] ROMEO indisponible, repli IA :', err.message);
  }

  // 2. Repli IA.
  try {
    const viaAI = await getRomeViaAI(label.trim(), limit);
    return viaAI.map((m) => ({ ...m, source: 'ai' }));
  } catch (err) {
    console.error('[ROME] Repli IA en échec :', err.message);
    throw new Error(`Erreur suggestion code ROME : ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LA BONNE BOÎTE v2 — Entreprises à fort potentiel de recrutement
// Scope : api_labonneboitev2
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renvoie la liste des entreprises classées par score de recrutabilité.
 *
 * @param {Object}   opts
 * @param {string}   opts.romeCode   - code ROME cible (ex. "M1805")
 * @param {number}   opts.latitude   - centre de recherche
 * @param {number}   opts.longitude
 * @param {number}   [opts.distance=30]    - rayon en km
 * @param {string}   [opts.nafCodes]       - codes NAF séparés par virgules
 * @param {string}   [opts.headcount]      - tranche d'effectif (code FT)
 * @param {string}   [opts.contract]       - "dpae" ou "alternance"
 * @param {number}   [opts.page=1]
 * @param {number}   [opts.pageSize=20]
 * @returns {Promise<{ companies: Array, total: number }>}
 */
export async function getLaBonneBoite({
  romeCode,
  citycode,
  postcode,
  departmentNumber,
  city,
  region,
  distance = 30,
  nafCodes,
  headcount,
  contract,
  page = 1,
  pageSize = 20,
}) {
  // v2 /recherche IGNORE latitude/longitude : il exige un critère nommé parmi
  // city | citycode | postcode | department_number | region. Avec des lat/lon,
  // l'API répond 200 mais resolved_params.locations = null → 0 entreprise, quel
  // que soit le métier. On envoie donc un code de localisation.
  const loc =
    (citycode && { citycode: String(citycode) }) ||
    (postcode && { postcode: String(postcode) }) ||
    (departmentNumber && { department_number: String(departmentNumber) }) ||
    (city && { city: String(city) }) ||
    (region && { region: String(region) }) ||
    null;

  if (!romeCode || !loc) {
    throw new Error('getLaBonneBoite : romeCode et une localisation (citycode, postcode, department_number, city ou region) sont obligatoires.');
  }

  // 3 scopes requis selon le spec OpenAPI officiel
  const token = await getAccessToken('api_labonneboitev2 search office');

  // v2 : param 'rome' (pas rome_codes), localisation par code nommé.
  const query = new URLSearchParams({
    rome:      romeCode,
    distance:  String(distance),
    page:      String(page),
    page_size: String(pageSize),
    ...loc,
  });
  if (nafCodes)  query.set('naf',      nafCodes);
  if (headcount) query.set('headcount', headcount);
  if (contract)  query.set('contract',  contract);

  const res = await fetchWithTimeout(`${LBB_URL}?${query}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });

  if (res.status === 204) return { companies: [], total: 0 };
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    const wwwAuth = res.headers.get('www-authenticate') ?? '';
    const xError  = res.headers.get('x-error') ?? '';
    console.error('[FranceTravail/LBB] Erreur', res.status, detail);
    console.error('[FranceTravail/LBB] www-authenticate:', wwwAuth);
    console.error('[FranceTravail/LBB] x-error:', xError);
    const hint = [detail, wwwAuth, xError].filter(Boolean).join(' | ').slice(0, 400);
    throw new Error(`Erreur La Bonne Boîte (${res.status})${hint ? ' — ' + hint : ''}`);
  }

  const data = await res.json();
  // v2 : résultats dans data.items, total dans data.hits
  const items = data.items ?? data.companies ?? [];

  return {
    total: data.hits ?? items.length,
    companies: items.map((c) => ({
      siret:         c.siret ?? '',
      name:          c.company_name ?? c.office_name ?? '',
      naf:           c.naf ?? '',
      // naf_label est fourni par l'API v2 et contient l'activité de l'entreprise
      nafText:       c.naf_label ?? '',
      address:       c.street_name ?? c.address ?? '',
      city:          c.city ?? '',
      zipcode:       c.postcode ?? c.zipcode ?? '',
      latitude:      c.location?.lat ?? null,
      longitude:     c.location?.lon ?? null,
      headcountText: (c.headcount_min && c.headcount_max)
        ? `${c.headcount_min}–${c.headcount_max} salariés`
        : '',
      stars:         c.hiring_potential ?? null,
      // LBB v2 ne fournit pas de site web ni d'adresse email directement.
      // Le champ "email" est un booléen ("yes"/"no") indiquant si LBB a un
      // email en base — il ne l'expose pas via l'API publique.
      website:       null,
      lbbHasEmail:   c.email === 'yes',  // indice utile, pas une adresse
      url:           null,
    })),
  };
}
