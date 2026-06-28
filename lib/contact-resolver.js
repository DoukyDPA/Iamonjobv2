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
//   3. Vérifier l'existence d'un enregistrement MX sur le domaine (DNS).
//   4. Construire les adresses de fonction candidates (par ordre de priorité).
//   5. Repli si rien ne tient : marquer "formulaire" avec l'URL LBB.
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

// ─── Heuristique nom d'entreprise → candidats de domaine ─────────────────
// Dernier recours quand ni LBB ni SIRENE ne fournissent de site.
// On retire les formes juridiques, on normalise, puis on sonde .fr et .com.

const LEGAL_FORMS = /\b(SAS|SARL|SA|SNC|SASU|EURL|SC|SCI|SCP|GIE|SCOP|SE|GmbH|Inc|Ltd|LLC|Corp|COOP|SCIC|ASSO|ASSOCIATION|GROUPE|GROUP)\b\.?/gi;
const NOISE_WORDS = /\b(le|la|les|de|du|des|et|en|au|aux)\b/gi;

function toAscii(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim();
}

function companyNameToDomainCandidates(name) {
  if (!name || typeof name !== 'string') return [];

  const cleaned = toAscii(
    name
      .replace(LEGAL_FORMS, ' ')
      .replace(NOISE_WORDS, ' ')
      .toLowerCase()
  )
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!cleaned || cleaned.length < 2) return [];

  const noHyphen = cleaned.replace(/-/g, '');
  const candidates = [`${cleaned}.fr`, `${cleaned}.com`];
  if (noHyphen !== cleaned) {
    candidates.push(`${noHyphen}.fr`, `${noHyphen}.com`);
  }
  return candidates;
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

// ─── Vérification MX ──────────────────────────────────────────────────────
// Un enregistrement MX valide indique que le domaine reçoit des emails.
// On ne fait pas de vérification SMTP (trop instable, souvent bloquée par
// les FAI et les hébergeurs).

async function hasMxRecord(domain) {
  try {
    const records = await dns.resolveMx(domain);
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

  // 1. Domaine depuis le champ website de LBB
  let domain = extractDomain(company.website);
  let method = domain ? 'website_lbb' : null;

  // 2. Repli : Annuaire des Entreprises via SIRET
  if (!domain) {
    domain = await getDomainFromSiret(company.siret);
    if (domain) method = 'annuaire';
  }

  // 3. Repli heuristique : dériver le domaine depuis le nom de l'entreprise.
  //    On tente plusieurs candidats (.fr, .com) et on garde le premier avec MX.
  if (!domain && company.name) {
    const candidates = companyNameToDomainCandidates(company.name);
    for (const candidate of candidates) {
      const mx = await hasMxRecord(candidate).catch(() => false);
      if (mx) { domain = candidate; method = 'name_heuristic'; break; }
    }
  }

  if (!domain) {
    // Repli ultime : le candidat candidatera via le formulaire du site LBB
    return { ...base, method: 'no_domain', lbbUrl: company.url };
  }

  // 3. Vérification MX
  const mxOk = await hasMxRecord(domain);
  if (!mxOk) {
    return { ...base, domain, method: 'no_mx', lbbUrl: company.url };
  }

  // 4. Construction des adresses candidates
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
