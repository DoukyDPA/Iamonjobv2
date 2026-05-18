const AUTH_URL =
  'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire';
const SEARCH_URL =
  'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search';

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('FRANCE_TRAVAIL_CLIENT_ID / FRANCE_TRAVAIL_CLIENT_SECRET non configurés.');
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'api_offresdemploiv2 o2dsoffre');

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Authentification France Travail refusée (${res.status}). ${detail}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in - 60) * 1000;
  return cachedToken;
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
  console.log('[FranceTravail] GET', url);

  const res = await fetch(url, {
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
  const token = await getAccessToken();
  const variants = searchVariants(keywords);

  console.log('[FranceTravail] Variantes :', variants);

  // Cascade : on essaie chaque variante jusqu'à obtenir des résultats
  for (const variant of variants) {
    const resultats = await fetchOffers(token, variant, location, limit);
    console.log(`[FranceTravail] "${variant}" → ${resultats.length} résultat(s)`);
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
