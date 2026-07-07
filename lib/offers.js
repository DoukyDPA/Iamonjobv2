import { searchOffers as searchFranceTravail } from '@/lib/france-travail';
import { fetchWithTimeout } from '@/lib/http';
import { resolveLocationName } from '@/lib/geo-fr';

// ════════════════════════════════════════════════════════════════════════════
// AGRÉGATEUR D'OFFRES MULTI-SOURCES
//
// Interroge en parallèle France Travail (clé ROME), Adzuna (mot-clé) et Jooble
// (optionnel). Chaque offre garde sa source. On fusionne en round-robin pour
// garantir la diversité, on dédoublonne les annonces reprises d'un site à
// l'autre, puis on plafonne. Une source en échec n'empêche pas les autres.
//
// Format interne commun (identique à celui de France Travail) :
//   { id, intitule, entreprise, lieu, typeContrat, description,
//     competencesRequises: [], salaire, url, source }
// ════════════════════════════════════════════════════════════════════════════

const ADZUNA_SEARCH_URL = 'https://api.adzuna.com/v1/api/jobs/fr/search/1';
// Endpoint FR : jooble.org (sans sous-domaine) renvoie 403 (WAF). Le
// sous-domaine fr. répond bien. Voir doc : https://fr.jooble.org/api/about
const JOOBLE_URL = 'https://fr.jooble.org/api/';

// Nettoie un intitulé (appellation ROME) pour une recherche plein texte :
// retire parenthèses et variante féminine ("Boucher / Bouchère" → "Boucher").
function cleanTerm(s) {
  if (!s) return '';
  return s.replace(/\([^)]*\)/g, ' ').split('/')[0].replace(/\s+/g, ' ').trim();
}

// Adzuna et Jooble attendent un NOM de lieu, jamais un code : « 69 » leur renvoie
// zéro offre, un champ vide leur fait ratisser toute la France. On convertit donc
// le code saisi (département ou code postal) en nom de département avant l'appel.
function textLocation(location) {
  return resolveLocationName(location);
}

function formatEuroRange(min, max) {
  const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
  if (min && max) return `${fmt(min)} – ${fmt(max)} € brut/an`;
  if (min) return `À partir de ${fmt(min)} € brut/an`;
  if (max) return `Jusqu'à ${fmt(max)} € brut/an`;
  return 'Salaire non précisé';
}

// ─── Adzuna ──────────────────────────────────────────────────────────────────
async function searchAdzunaOffers({ keywords, location, limit }) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const what = cleanTerm(keywords);
  if (!appId || !appKey || !what) return [];

  const query = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: String(Math.min(limit, 20)),
    what,
    'content-type': 'application/json',
  });
  const where = textLocation(location);
  if (where) query.set('where', where);

  try {
    const res = await fetchWithTimeout(`${ADZUNA_SEARCH_URL}?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      console.warn('[Offers/Adzuna] Réponse', res.status);
      return [];
    }
    const data = await res.json();
    return (data.results || []).map((r) => ({
      id: `adzuna-${r.id}`,
      intitule: r.title || 'Offre',
      entreprise: r.company?.display_name || 'Entreprise non divulguée',
      lieu: r.location?.display_name || 'Non spécifié',
      typeContrat: r.contract_type || r.contract_time || 'Non spécifié',
      description: r.description || 'Aucune description fournie.',
      competencesRequises: [],
      salaire: formatEuroRange(r.salary_min, r.salary_max),
      url: r.redirect_url || null,
      source: 'Adzuna',
    }));
  } catch (err) {
    console.warn('[Offers/Adzuna] Appel échoué :', err.message);
    return [];
  }
}

// ─── Jooble (optionnel : nécessite JOOBLE_API_KEY) ───────────────────────────
async function searchJoobleOffers({ keywords, location, limit }) {
  const key = process.env.JOOBLE_API_KEY;
  const what = cleanTerm(keywords);
  // Diagnostics sans jamais exposer la clé (on ne logue que sa présence).
  if (!key) { console.warn('[Offers/Jooble] JOOBLE_API_KEY absente de l\'environnement'); return []; }
  if (!what) { console.warn('[Offers/Jooble] Aucun mot-clé exploitable'); return []; }

  try {
    const res = await fetchWithTimeout(`${JOOBLE_URL}${key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // Certains pare-feux (WAF) rejettent les requêtes serveur sans
        // User-Agent de navigateur : on en fournit un pour passer.
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
      },
      body: JSON.stringify({ keywords: what, location: textLocation(location) }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.warn('[Offers/Jooble] Réponse', res.status, detail.slice(0, 200));
      return [];
    }
    const data = await res.json();
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    console.info(`[Offers/Jooble] ${jobs.length} offre(s) (totalCount=${data.totalCount ?? '?'})`);
    return jobs.slice(0, limit).map((j, i) => ({
      id: `jooble-${j.id || i}`,
      intitule: j.title || 'Offre',
      entreprise: j.company || 'Entreprise non divulguée',
      lieu: j.location || 'Non spécifié',
      typeContrat: j.type || 'Non spécifié',
      description: j.snippet || 'Aucune description fournie.',
      competencesRequises: [],
      salaire: j.salary || 'Salaire non précisé',
      url: j.link || null,
      source: 'Jooble',
    }));
  } catch (err) {
    console.warn('[Offers/Jooble] Appel échoué :', err.message);
    return [];
  }
}

// Clé de déduplication : intitulé + entreprise normalisés.
function dedupeKey(offer) {
  return `${offer.intitule}|${offer.entreprise}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Fusion round-robin : une offre de chaque source à tour de rôle, pour éviter
// qu'une seule plateforme monopolise la liste.
function interleave(lists) {
  const merged = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      if (i < list.length) merged.push(list[i]);
    }
  }
  return merged;
}

/**
 * Recherche agrégée. France Travail utilise la clé ROME (précise), Adzuna et
 * Jooble le mot-clé. Chaque offre est taguée par sa source.
 *
 * @param {Object} opts
 * @param {string} [opts.keywords] - intitulé (appellation ROME de préférence)
 * @param {string} [opts.codeRome] - code ROME famille (France Travail)
 * @param {string} [opts.location] - code postal, département ou nom de lieu
 * @param {number} [opts.limit=8]
 * @returns {Promise<Array>} offres fusionnées, dédoublonnées, plafonnées
 */
export async function searchAllOffers({ keywords, codeRome, location, limit = 8 }) {
  // On demande un peu plus à chaque source avant fusion et dédoublonnage.
  const perSource = Math.max(limit, 8);

  const [ft, adzuna, jooble] = await Promise.allSettled([
    searchFranceTravail({ keywords, codeRome, location, limit: perSource }),
    searchAdzunaOffers({ keywords, location, limit: perSource }),
    searchJoobleOffers({ keywords, location, limit: perSource }),
  ]);

  const val = (r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []);
  // Ordre des sources = priorité en cas de doublon (France Travail d'abord,
  // car ses offres portent les compétences structurées utiles à l'analyse).
  const lists = [val(ft), val(adzuna), val(jooble)];

  const seen = new Set();
  const deduped = [];
  for (const offer of interleave(lists)) {
    const key = dedupeKey(offer);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(offer);
  }

  return deduped.slice(0, limit);
}
