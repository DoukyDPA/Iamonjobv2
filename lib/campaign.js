// ════════════════════════════════════════════════════════════════════════════
// Orchestrateur de campagne — Lot 3 du module candidatures spontanées.
//
// Reçoit le CV + le métier cible + la liste d'entreprises résolues (LBB +
// contacts), appelle l'IA pour synthétiser le profil et générer le brouillon
// d'email, assemble le document de campagne, et le sauvegarde en Firestore.
//
// Structure Firestore : campaigns/{campaignId}
//   uid, status, jobTitle, codeRome, candidateProfile, emailTemplate,
//   companies[], validationLog, createdAt, updatedAt.
//
// Statuts possibles (pilotés par le Lot 4) :
//   'draft'              → généré, pas encore soumis au conseiller
//   'pending_validation' → soumis, en attente de la séance
//   'validated'          → validé par le conseiller, prêt à l'envoi
//   'sending'            → envoi en cours (Lot 5)
//   'done'               → tous les emails envoyés
// ════════════════════════════════════════════════════════════════════════════

import { callAI, availableProviders } from '@/lib/ai/index';
import { buildAIRequest } from '@/lib/ai/prompts';
import { adminDb, FieldValue } from '@/lib/firebase/admin';

// ─── Personnalisation du brouillon email ──────────────────────────────────
// On remplace les marqueurs de l'IA par les données réelles de l'entreprise.

function personalizeEmail(template, company) {
  const sector = (company.nafText || company.naf || '').replace(/\(.*?\)/g, '').trim();
  return template
    .replace(/\{\{NOM_ENTREPRISE\}\}/g, company.name || '')
    .replace(/\{\{VILLE\}\}/g, company.city || '')
    .replace(/\{\{SECTEUR\}\}/g, sector || 'votre secteur');
}

// ─── Appel IA centralisé ──────────────────────────────────────────────────

async function runAI(action, params) {
  const provider = availableProviders()[0] ?? 'gemini';
  const { systemInstruction, prompt, isJson, task } = buildAIRequest({ action, params });
  return callAI({ provider, task, systemInstruction, prompt, isJson });
}

// ─── Point d'entrée public ────────────────────────────────────────────────

/**
 * Génère un document de campagne de candidatures spontanées et le sauvegarde
 * en Firestore.
 *
 * @param {Object} opts
 * @param {string}   opts.uid         - Firebase uid du candidat
 * @param {string}   opts.cvText      - texte brut du CV
 * @param {string}   opts.jobTitle    - intitulé libre du métier cible
 * @param {string}   opts.codeRome    - code ROME retenu
 * @param {Object[]} opts.companies   - entreprises LBB avec contacts résolus
 *   Chaque entrée : { siret, name, naf, nafText, city, zipcode, headcountText,
 *                     stars, url, website, email, candidates, domain, method, lbbUrl }
 *
 * @returns {Promise<{ campaignId: string, campaign: Object }>}
 */
export async function generateCampaign({ uid, cvText, jobTitle, codeRome, companies }) {
  // ── 1. Synthèse du profil candidat ────────────────────────────────────
  const profile = await runAI('campaign_profile', { cvText, jobTitle, codeRome });

  // ── 2. Brouillon email avec placeholders ──────────────────────────────
  const emailTemplate = await runAI('campaign_email_draft', {
    jobTitle,
    summary:   profile.summary   ?? '',
    keySkills: profile.keySkills ?? [],
    pitchLine: profile.pitchLines?.[0] ?? '',
  });

  // ── 3. Assemblage des entreprises avec email personnalisé ──────────────
  const companiesWithDrafts = companies.map((c) => ({
    // Données LBB
    siret:         c.siret         ?? '',
    name:          c.name          ?? '',
    naf:           c.naf           ?? '',
    nafText:       c.nafText       ?? '',
    city:          c.city          ?? '',
    zipcode:       c.zipcode       ?? '',
    headcountText: c.headcountText ?? '',
    stars:         c.stars         ?? null,
    lbbUrl:        c.lbbUrl        ?? c.url ?? null,
    // Contact résolu
    email:         c.email         ?? null,
    candidates:    c.candidates    ?? [],
    domain:        c.domain        ?? null,
    contactMethod: c.method        ?? 'no_domain',
    // Email personnalisé (corps uniquement, objet identique pour tous)
    emailBody: c.email
      ? personalizeEmail(emailTemplate.body ?? '', c)
      : null,
    // Décision conseiller (remplie au Lot 4)
    decision: 'pending', // 'pending' | 'keep' | 'reject'
    notes:    '',
    sentAt:   null,
  }));

  // ── 4. Document de campagne ────────────────────────────────────────────
  const now = FieldValue.serverTimestamp();
  const campaign = {
    uid,
    status:    'draft',
    jobTitle,
    codeRome,
    candidateProfile: {
      summary:        profile.summary        ?? '',
      keySkills:      profile.keySkills      ?? [],
      pitchLines:     profile.pitchLines     ?? [],
      decisionPoints: profile.decisionPoints ?? [],
    },
    emailTemplate: {
      subject: emailTemplate.subject ?? '',
      body:    emailTemplate.body    ?? '',
    },
    companies: companiesWithDrafts,
    validationLog: {
      preparedAt:   now,
      validatedAt:  null,
      validatedBy:  null,
      advisorNotes: '',
    },
    createdAt: now,
    updatedAt: now,
  };

  // ── 5. Sauvegarde Firestore ───────────────────────────────────────────
  // Le serveur Admin SDK contourne les règles Firestore (collection server-only).
  const ref = await adminDb.collection('campaigns').add(campaign);

  return { campaignId: ref.id, campaign };
}

/**
 * Récupère une campagne par son ID et vérifie l'appartenance à l'uid.
 * Retourne null si introuvable ou si l'uid ne correspond pas.
 *
 * @param {string} campaignId
 * @param {string} uid
 * @returns {Promise<({ id: string } & Object) | null>}
 */
export async function getCampaignById(campaignId, uid) {
  const doc = await adminDb.doc(`campaigns/${campaignId}`).get();
  if (!doc.exists) return null;
  const data = doc.data();
  if (data.uid !== uid) return null;
  return { id: doc.id, ...data };
}

/**
 * Récupère les campagnes d'un utilisateur, ordonnées par date de création.
 *
 * @param {string} uid
 * @returns {Promise<Array<{ id: string } & Object>>}
 */
export async function getCampaigns(uid) {
  const snap = await adminDb
    .collection('campaigns')
    .where('uid', '==', uid)
    .orderBy('createdAt', 'desc')
    .limit(20)
    .get();

  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Met à jour le statut et/ou les données d'une campagne.
 * Utilisé par le Lot 4 (validation conseiller) et le Lot 5 (envoi).
 *
 * @param {string} campaignId
 * @param {Object} updates - champs à écraser (merge)
 */
export async function updateCampaign(campaignId, updates) {
  await adminDb.doc(`campaigns/${campaignId}`).set(
    { ...updates, updatedAt: FieldValue.serverTimestamp() },
    { merge: true }
  );
}
