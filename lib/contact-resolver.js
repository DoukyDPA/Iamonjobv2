// ════════════════════════════════════════════════════════════════════════════
// Résolution du contact fonctionnel — Lot 2 du module candidatures spontanées.
//
// Objectif : à partir d'une entreprise renvoyée par La Bonne Boîte (SIRET +
// éventuellement un website), trouver une adresse de FONCTION exploitable
// (recrutement@, rh@, contact@…). Jamais une personne nommée.
//
// Choix juridique délibéré (art. 6 RGPD) : on ne recherche pas, ne stocke
// pas et ne transmet pas d'adresses nominatives. Les adresses de fonction
// relèvent de la communication professionnelle de l'entreprise.
//
// Pipeline par entreprise :
//   1. Extraire le domaine depuis le champ `website` renvoyé par LBB.
//   2. Si absent, interroger l'Annuaire des Entreprises (data.gouv.fr) avec
//      le SIRET pour récupérer le site web.
//   3. Si un domaine est trouvé, vérifier qu'il répond réellement via HTTP.
//   4. Vérifier l'existence d'un enregistrement MX sur le domaine (DNS).
//   5. Construire les adresses de fonction candidates (par ordre de priorité).
//   6. Repli si rien ne tient : marquer "formulaire" avec l'URL LBB.
//
// NOTE : l'heuristique nom d'entreprise → domaine deviné a été retirée.
// Elle produisait des adresses plausibles mais non vérifiées.
// Pour améliorer la couverture, brancher un moteur de recherche :
//   - Brave Search API (gratuit jusqu'à 2 000 req/mois) : brave.com/search/api/
//   - Clé à ajouter dans .env.local : BRAVE_SEARCH_API_KEY=
// ════════════════════════════════════════════════════════════════════════════

import dns from 'node:dns/promises';
import { fetchWithTimeout } from '@/lib/http';

// Adresses de fonction, par ordre de probabilité dans le contexte RH/recrutement.
const FUNCTIONAL_PREFIXES = [
  'recrutement',
  'rh',
  'contact',
  'emploi',
  'candidature',
  'jobs',
];

// Domaines génériques à écarter (boîtes mail personnelles, hébergeurs…).
const GENERIC_DOMAINS = new Set([
  'gmail.com', 'yahoo.fr', 'yahoo.com', 'hotmail.com', 'hotmail.fr',
  'outlook.com', 'outlook.fr', 'orange.fr', 'sfr.fr', 'free.fr',
  'laposte.net', 'wanadoo.fr', 'live.fr', 'live.com', 'icloud.com',
]);

// ─── Utilitaires ──────────────────────────────────────────────────────────

function extractDomain(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const raw = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, '');
    if (!host || host.length < 4 || !host.includes('.')) return null;
    if (GENERIC_DOMAINS.has(host)) return null;
    return host;
  } catch {
    return null;
  }
}

// ─── Lookup Annuaire des Entreprises (SIRENE via data.gouv.fr) ────────────
// API publique, sans authentification.
// Doc : https://recherche-entreprises.api.gouv.fr

async function getDomainFromSiret(siret) {
  if (!siret || typeof siret !== 'string') return null;
  const clean = siret.replace(/\s/g, '');
  if (!/^\d{14}$/.test(clean)) return null;

  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${clean}&page=1&per_page=1`;
    const res = await fetchWithTimeout(url, { headers: { Accept: 'application/json' } }, 8000);
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.results?.[0];
    if (!result) return null;

    // Le champ peut s'appeler `site_web`, `url_entreprise`, ou être imbriqué.
    const website =
      result.site_web ||
      result.url_entreprise ||
      result.etablissement_siege?.site_web ||
      null;

    return extractDomain(website);
  } catch {
    return null;
  }
}

// ─── Recherche web via Brave Search (optionnelle) ─────────────────────────
// Brancher pour améliorer la couverture sur les entreprises sans site dans
// l'Annuaire. Gratuit jusqu'à 2 000 requêtes/mois.
// Inscription : https://brave.com/search/api/
// Variable d'environnement : BRAVE_SEARCH_API_KEY

async function getDomainFromBraveSearch(companyName, siret) {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return null;

  const siren = siret?.replace(/\s/g, '').slice(0, 9);
  // La requête combine nom + SIREN pour réduire les ambiguïtés.
  const query = siren
    ? `site officiel "${companyName}" ${siren}`
    : `site officiel "${companyName}"`;

  try {
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3&country=fr&search_lang=fr`;
    const res = await fetchWithTimeout(url, {
      headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip', 'X-Subscription-Token': key },
    }, 6000);
    if (!res.ok) return null;

    const data = await res.json();
    const results = data?.web?.results ?? [];
    for (const r of results) {
      const domain = extractDomain(r.url);
      if (domain) return domain;
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Vérification HTTP ────────────────────────────────────────────────────
// Confirme que le site web existe vraiment et répond.
// Un domaine avec MX mais sans site web ne garantit pas qu'on a la bonne
// entreprise. Un HEAD sur https:// et http:// suffit à vérifier.

const HTTP_CHECK_TIMEOUT_MS = 4000;

async function siteResponds(domain) {
  for (const scheme of ['https', 'http']) {
    try {
      const res = await fetchWithTimeout(
        `${scheme}://www.${domain}`,
        { method: 'HEAD', redirect: 'follow' },
        HTTP_CHECK_TIMEOUT_MS,
      );
      if (res.ok || (res.status >= 300 && res.status < 500)) return true;
    } catch {
      // on tente l'autre scheme
    }
  }
  return false;
}

// ─── Vérification MX ──────────────────────────────────────────────────────
// Un enregistrement MX valide indique que le domaine reçoit des emails.
// On ne fait pas de vérification SMTP (trop instable, souvent bloquée par
// les FAI et les hébergeurs).
//
// Timeout : dns.resolveMx n'a pas de délai natif. Sur un domaine inexistant
// ou un serveur DNS lent, la promesse peut rester en attente 30 s.
// On borne à MX_TIMEOUT_MS pour éviter de bloquer tout le pipeline.

const MX_TIMEOUT_MS = 3000;

async function hasMxRecord(domain) {
  try {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('dns_timeout')), MX_TIMEOUT_MS)
    );
    const records = await Promise.race([dns.resolveMx(domain), timeout]);
    return Array.isArray(records) && records.length > 0;
  } catch {
    return false;
  }
}

// ─── Point d'entrée public ────────────────────────────────────────────────

/**
 * Résout le contact fonctionnel pour une entreprise issue de La Bonne Boîte.
 *
 * @param {Object} company  - objet renvoyé par getLaBonneBoite()
 *   { siret, name, website, url, ... }
 *
 * @returns {Promise<{
 *   siret:      string,
 *   name:       string,
 *   email:      string|null,
 *   candidates: string[],   // toutes les adresses candidates (pour le conseiller)
 *   domain:     string|null,
 *   method:     string,     // 'website_lbb' | 'annuaire' | 'formulaire' | 'no_mx' | 'no_domain'
 *   lbbUrl:     string|null,
 * }>}
 */
export async function resolveContact(company) {
  const base = {
    siret:      company.siret ?? '',
    name:       company.name  ?? '',
    email:      null,
    candidates: [],
    domain:     null,
    method:     'no_domain',
    lbbUrl:     company.url ?? null,
  };

  // 0. Email direct fourni par une source tierce fiable (pas LBB v2, qui ne
  //    donne que le booléen lbbHasEmail). Ici pour extensibilité future.
  if (company.email && typeof company.email === 'string' && company.email.includes('@')) {
    const domain0 = extractDomain(`https://${company.email.split('@')[1]}`);
    return {
      ...base,
      email:      company.email,
      candidates: [company.email],
      domain:     domain0,
      method:     'lbb_direct',
    };
  }

  // 1. Domaine depuis le champ website de LBB
  let domain = extractDomain(company.website);
  let method = domain ? 'website_lbb' : null;

  // 2. Repli : Annuaire des Entreprises (SIRENE) via SIRET
  if (!domain) {
    domain = await getDomainFromSiret(company.siret);
    if (domain) method = 'annuaire';
  }

  // 3. Repli : Brave Search (si BRAVE_SEARCH_API_KEY est configurée)
  //    Cherche le site officiel par nom d'entreprise + SIREN.
  if (!domain && company.name) {
    domain = await getDomainFromBraveSearch(company.name, company.siret);
    if (domain) method = 'search';
  }

  // Pas de domaine trouvé par aucune source fiable.
  if (!domain) {
    return { ...base, method: 'no_domain', lbbUrl: company.url };
  }

  // 4. Vérification HTTP : le site répond-il vraiment ?
  //    Évite de construire des adresses pour un domaine mal identifié.
  const siteOk = await siteResponds(domain);
  if (!siteOk) {
    // Le domaine existe peut-être mais le site ne répond pas — on ne propose
    // pas d'adresse inventée.
    return { ...base, domain, method: 'no_site', lbbUrl: company.url };
  }

  // 5. Vérification MX
  const mxOk = await hasMxRecord(domain);
  if (!mxOk) {
    return { ...base, domain, method: 'no_mx', lbbUrl: company.url };
  }

  // 6. Construction des adresses de fonction candidates
  const candidates = FUNCTIONAL_PREFIXES.map((p) => `${p}@${domain}`);

  // L'adresse principale est la première de la liste ; le conseiller peut
  // en sélectionner une autre lors de la validation en séance.
  return {
    ...base,
    email:      candidates[0],
    candidates,
    domain,
    method,
  };
}

/**
 * Résout le contact pour un lot d'entreprises en parallèle (max 5 simultanés
 * pour ne pas saturer le DNS ni le quota de l'Annuaire des Entreprises).
 *
 * @param {Object[]} companies
 * @returns {Promise<Object[]>}
 */
export async function resolveContacts(companies) {
  const CHUNK = 5;
  const results = [];

  for (let i = 0; i < companies.length; i += CHUNK) {
    const batch = companies.slice(i, i + CHUNK);
    const settled = await Promise.allSettled(batch.map(resolveContact));
    for (let j = 0; j < settled.length; j++) {
      const s = settled[j];
      if (s.status === 'fulfilled') {
        results.push(s.value);
      } else {
        // En cas d'erreur inattendue, on retourne un repli formulaire
        results.push({
          siret:      batch[j].siret ?? '',
          name:       batch[j].name  ?? '',
          email:      null,
          candidates: [],
          domain:     null,
          method:     'error',
          lbbUrl:     batch[j].url ?? null,
        });
      }
    }
  }

  return results;
}
