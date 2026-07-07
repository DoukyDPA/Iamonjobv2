import { fetchWithTimeout } from '@/lib/http';

// ════════════════════════════════════════════════════════════════════════════
// SALAIRE SOURCÉ — Adzuna (endpoint histogram)
//
// Remplace l'estimation approximative produite par l'IA dans la fiche métier
// par une fourchette calculée sur la distribution réelle des offres publiées.
// Adzuna agrège des milliers de sources d'emploi en France ; son endpoint
// « histogram » renvoie le nombre d'offres par tranche de salaire pour une
// recherche donnée. On en déduit une médiane et des quartiles.
//
// Réponse Adzuna (clés = borne basse de tranche, valeurs = nb d'offres) :
//   { "histogram": { "20000": "154", "30000": "69", "40000": "51", ... } }
// L'ordre des clés n'est pas garanti : on trie systématiquement.
// ════════════════════════════════════════════════════════════════════════════

const HISTOGRAM_URL = 'https://api.adzuna.com/v1/api/jobs/fr/histogram';

// Nombre minimal d'offres sous lequel la fourchette n'est pas significative.
const MIN_SAMPLE = 8;

/**
 * Calcule un percentile (0..1) sur un histogramme trié.
 * Chaque tranche couvre [borne, borne_suivante[. On interpole linéairement
 * à l'intérieur de la tranche qui contient le rang cherché.
 *
 * @param {Array<{ low: number, width: number, count: number }>} buckets
 * @param {number} total - somme des effectifs
 * @param {number} p - percentile visé, entre 0 et 1
 * @returns {number} salaire estimé
 */
function percentile(buckets, total, p) {
  const target = p * total;
  let cumulative = 0;
  for (const b of buckets) {
    if (cumulative + b.count >= target) {
      const within = (target - cumulative) / b.count; // 0..1 dans la tranche
      return Math.round(b.low + within * b.width);
    }
    cumulative += b.count;
  }
  // Sécurité : renvoie la borne haute de la dernière tranche.
  const last = buckets[buckets.length - 1];
  return Math.round(last.low + last.width);
}

/**
 * Transforme l'objet histogram brut en tranches triées et exploitables.
 * @returns {{ buckets: Array, total: number } | null}
 */
function parseHistogram(histogram) {
  if (!histogram || typeof histogram !== 'object') return null;

  const rows = Object.entries(histogram)
    .map(([low, count]) => ({ low: Number(low), count: Number(count) }))
    .filter((r) => Number.isFinite(r.low) && Number.isFinite(r.count) && r.count >= 0)
    .sort((a, b) => a.low - b.low);

  if (rows.length === 0) return null;

  // Largeur de chaque tranche = écart jusqu'à la tranche suivante.
  // Pour la dernière, on reprend la largeur précédente (défaut 10000).
  const buckets = rows.map((r, i) => {
    const next = rows[i + 1];
    const width = next ? next.low - r.low : (rows[i - 1] ? r.low - rows[i - 1].low : 10000);
    return { low: r.low, width, count: r.count };
  });

  const total = buckets.reduce((sum, b) => sum + b.count, 0);
  if (total === 0) return null;

  return { buckets, total };
}

/**
 * Formate un montant annuel brut en euros, sans décimales.
 * @param {number} n
 * @returns {string} ex. "32 000 €"
 */
function formatEuro(n) {
  return `${Math.round(n).toLocaleString('fr-FR')} €`;
}

/**
 * Renvoie une fourchette salariale sourcée pour un intitulé de métier.
 *
 * @param {Object} opts
 * @param {string} opts.jobTitle - intitulé de métier (ex. "Responsable qualité")
 * @param {string} [opts.location] - libellé, code postal ou département (best-effort)
 * @returns {Promise<null | {
 *   source: string, sourceUrl: string, currency: string,
 *   p25: number, median: number, p75: number,
 *   label: string, rangeLabel: string, sampleSize: number, year: number
 * }>}
 *   null si la donnée n'est pas disponible (clé absente, aucune offre, etc.).
 *   Le champ salaire IA sert alors de repli.
 */
export async function getSalaryStats({ jobTitle, location }) {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;

  // Sans identifiants, on ne bloque pas le parcours : on laisse le repli IA.
  if (!appId || !appKey) return null;
  if (!jobTitle || !jobTitle.trim()) return null;

  // Les appellations ROME contiennent souvent une variante féminine et des
  // parenthèses ("Boucher / Bouchère", "Vendeur (H/F)"). On garde le terme de
  // tête pour une requête Adzuna propre.
  const cleanTitle = jobTitle
    .replace(/\([^)]*\)/g, ' ')
    .split('/')[0]
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);

  const query = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: cleanTitle || jobTitle.trim().slice(0, 120),
    'content-type': 'application/json',
  });

  // Adzuna attend un nom de lieu pour location1, pas un code postal.
  // On ne transmet la localisation que si c'est du texte (ville, région).
  if (location && !/^\d+$/.test(location.trim())) {
    query.set('location0', 'France');
    query.set('location1', location.trim().slice(0, 60));
  }

  let res;
  try {
    res = await fetchWithTimeout(`${HISTOGRAM_URL}?${query.toString()}`, {
      headers: { Accept: 'application/json' },
    });
  } catch (err) {
    console.error('[Salary/Adzuna] Appel échoué :', err.message);
    return null;
  }

  if (!res.ok) {
    // 400/403/429 : on journalise et on retombe sur le repli, sans casser l'UI.
    console.error('[Salary/Adzuna] Réponse', res.status);
    return null;
  }

  let data;
  try {
    data = await res.json();
  } catch {
    return null;
  }

  const parsed = parseHistogram(data.histogram);
  if (!parsed || parsed.total < MIN_SAMPLE) return null;

  const { buckets, total } = parsed;
  const p25 = percentile(buckets, total, 0.25);
  const median = percentile(buckets, total, 0.5);
  const p75 = percentile(buckets, total, 0.75);

  return {
    source: 'Adzuna',
    sourceUrl: 'https://www.adzuna.fr',
    currency: 'EUR',
    p25,
    median,
    p75,
    sampleSize: total,
    year: new Date().getFullYear(),
    // Libellés prêts à afficher.
    rangeLabel: `${formatEuro(p25)} – ${formatEuro(p75)} brut/an`,
    label: `Médiane ${formatEuro(median)} brut/an (${total} offres, Adzuna, ${new Date().getFullYear()})`,
  };
}
