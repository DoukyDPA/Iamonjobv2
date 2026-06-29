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

async function fetchOffers(token, keywords, location, limit) {
  const query = new URLSearchParams({
    motsCles: keywords,
    sort: '1',
    range: `0-${limit - 1}`,
  });

  if (location) {
    const loc = location.trim();
    if (/^\d{2,3}$/.test(loc))  query.set('departement', loc);
    else if (/^\d{5}$/.test(loc)) query.set('commune', loc);
  }

  const url = `${SEARCH_URL}?${query.toString()}`;

  const res = await fetchWithTimeout(url, {
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

export async function searchOffers({ keywords, location, limit = 5 }) {
  const token = await getAccessToken('api_offresdemploiv2 o2dsoffre');
  const variants = searchVariants(keywords);

  // On ne journalise PAS les mots-clés de recherche : ils peuvent révéler le
  // projet professionnel de l'utilisateur (donnée personnelle).

  // Cascade : on essaie chaque variante jusqu'à obtenir des résultats
  for (const variant of variants) {
    const resultats = await fetchOffers(token, variant, location, limit);
    if (resultats.length > 0) {
      return resultats.slice(0, limit).map((offer) => ({
        id: offer.id,
        intitule: offer.intitule,
        entreprise: offer.entreprise?.nom || 'Entreprise non divulguée',
        lieu: offer.lieuTravail?.libelle || 'Non spécifié',
        typeContrat: offer.typeContrat || 'Non spécifié',
        description: offer.description || 'Aucune description fournie.',
        competencesRequises: (offer.competences || []).map((c) => c.libelle),
        salaire: offer.salaire?.libelle || 'Salaire non précisé',
        url: offer.origineOffre?.urlOrigine || null,
      }));
    }
  }

  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// ROME 4.0 — Conversion intitulé libre → code(s) ROME via IA
// On utilise Gemini (déjà câblé) car l'API ROME 4.0 Compétences ne fournit
// pas d'endpoint de correspondance intitulé → code. ROMEO pourra remplacer
// cette brique si l'accès est ouvert ultérieurement.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renvoie la liste des codes ROME correspondant à un intitulé libre,
 * calculée par l'IA (Gemini 2.5 Flash).
 *
 * @param {string} label - ex. "développeur web", "infirmière", "chef de projet"
 * @param {number} limit - nombre de résultats max (défaut 3)
 * @returns {Promise<Array<{ codeRome: string, libelle: string }>>}
 */
export async function getRomeFromLabel(label, limit = 3) {
  const safeLabel = label.replace(/[`\r\n]+/g, ' ').trim().slice(0, 200);

  const systemInstruction = `Tu es un expert du ROME 4.0 (Répertoire Opérationnel des Métiers et des Emplois de France Travail).
À partir d'un intitulé de métier en texte libre, tu identifies les codes ROME 4.0 les plus pertinents.
Réponds UNIQUEMENT au format JSON : un tableau de ${limit} objets maximum, du plus pertinent au moins pertinent.
Structure exacte : [{ "codeRome": "X0000", "libelle": "Libellé officiel ROME" }]
Si l'intitulé ne correspond à aucun métier connu, renvoie [].`;

  const prompt = `Intitulé de métier : "${safeLabel}"\nIdentifie le ou les codes ROME 4.0 correspondants.`;

  try {
    const result = await callAI({
      provider: 'gemini',
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
  } catch (err) {
    console.error('[ROME/AI] Erreur suggestion ROME :', err.message);
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
  latitude,
  longitude,
  distance = 30,
  nafCodes,
  headcount,
  contract,
  page = 1,
  pageSize = 20,
}) {
  if (!romeCode || latitude == null || longitude == null) {
    throw new Error('getLaBonneBoite : romeCode, latitude et longitude sont obligatoires.');
  }

  // 3 scopes requis selon le spec OpenAPI officiel
  const token = await getAccessToken('api_labonneboitev2 search office');

  // v2 : param 'rome' (pas rome_codes), lat/lon directs
  const query = new URLSearchParams({
    rome:      romeCode,
    latitude:  String(latitude),
    longitude: String(longitude),
    distance:  String(distance),
    page:      String(page),
    page_size: String(pageSize),
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
