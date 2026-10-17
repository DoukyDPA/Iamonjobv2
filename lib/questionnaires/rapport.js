// ════════════════════════════════════════════════════════════════════════════
// Rapport de synthèse d'une promo — généré par Mistral à partir des fiches.
//
// 1. On rassemble les fiches de la promo (dossiers de la promo + fiches sans
//    dossier portant le même libellé, ex. XXXX).
// 2. Les chiffres (moyennes par semaine, engagements tenus) sont calculés ici,
//    pas par le modèle : il les commente, il ne les invente pas.
// 3. Mistral (UE) rédige la synthèse, au format JSON, sous les codes
//    uniquement. Le rapport est enregistré pour être relu sans relancer l'IA.
//
// Firestore : questionnaireRapports/{id}
//   conseillerUid, parcoursId, promo, createdAt, model, tokens,
//   stats (calculées), rapport (JSON du modèle), nbFiches, nbParticipants
// Accès : Admin SDK uniquement (règles fermées).
// ════════════════════════════════════════════════════════════════════════════

import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { getParcours, getQuestionnaire, toDetail } from '@/lib/questionnaires/catalogue';
import { callMistral } from '@/lib/ai/mistral';

const COL = 'questionnaireRapports';
const SCORES = ['confiance', 'moral', 'motivation', 'energie'];
const MAX_REPONSE = 600;   // caractères gardés par réponse libre
const MAX_PROMPT = 110_000;

const round1 = (n) => Math.round(n * 10) / 10;
const ms = (ts) => ts?.toMillis?.() ?? null;

// Fiches et participants d'une promo pour ce conseiller.
async function collectPromo(conseillerUid, parcoursId, promo) {
  const [bens, reps] = await Promise.all([
    adminDb.collection('beneficiaires').where('conseillerUid', '==', conseillerUid).get(),
    adminDb.collection('questionnaireReponses').where('conseillerUid', '==', conseillerUid).limit(2000).get(),
  ]);
  const dossiers = bens.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((b) => b.parcoursId === parcoursId && (b.promo || '') === (promo || ''));
  const ids = new Set(dossiers.map((d) => d.id));

  // Les questionnaires ponctuels (envoyés hors parcours, sans étape) restent
  // hors du rapport hebdomadaire.
  const fiches = reps.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.etape != null).filter((r) =>
    r.beneficiaireId ? ids.has(r.beneficiaireId)
      : r.parcoursId === parcoursId && (r.promo || '') === (promo || ''));

  const participants = new Map();
  for (const d of dossiers) participants.set(d.id, { code: d.code, fiches: [] });
  for (const f of fiches) {
    const key = f.beneficiaireId || `archive:${f.participant}`;
    if (!participants.has(key)) participants.set(key, { code: f.participant, fiches: [] });
    participants.get(key).fiches.push(f);
  }
  for (const p of participants.values()) p.fiches.sort((a, b) => a.etape - b.etape);
  return [...participants.values()].sort((a, b) => a.code.localeCompare(b.code));
}

// Chiffres de la promo, semaine par semaine.
function computeStats(participants, parcours) {
  const etapes = (parcours?.etapes || []).map((e) => {
    const fs = participants.flatMap((p) => p.fiches.filter((f) => f.etape === e.n));
    const moyennes = {};
    for (const k of SCORES) {
      const v = fs.map((f) => f.socle?.[k]).filter((n) => typeof n === 'number');
      if (v.length) moyennes[k] = round1(v.reduce((a, b) => a + b, 0) / v.length);
    }
    const tenus = fs.map((f) => f.socle?.engagementTenu).filter(Boolean);
    return {
      n: e.n,
      label: e.label,
      fiches: fs.length,
      moyennes,
      engagementsTenus: tenus.length ? Math.round((tenus.filter((t) => t === 'Oui').length / tenus.length) * 100) : null,
    };
  }).filter((e) => e.fiches > 0);
  return {
    participants: participants.length,
    avecFiches: participants.filter((p) => p.fiches.length).length,
    fiches: participants.reduce((a, p) => a + p.fiches.length, 0),
    etapes,
  };
}

const clip = (s) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > MAX_REPONSE ? `${t.slice(0, MAX_REPONSE)}…` : t;
};

function ficheToText(f) {
  const detail = f.source === 'archive' || !f.answers
    ? f.detail || []
    : (getQuestionnaire(f.questionnaireId) ? toDetail(getQuestionnaire(f.questionnaireId), f.answers) : []);
  const s = f.socle || {};
  const notes = SCORES.filter((k) => typeof s[k] === 'number').map((k) => `${k} ${s[k]}/10`).join(', ');
  const lignes = [`  S${f.etape} · ${f.titre || ''}${notes ? ` · ${notes}` : ''}`];
  if (s.engagementTenu) lignes.push(`    Engagement précédent tenu : ${s.engagementTenu}${s.obstacle ? ` (obstacle : ${clip(s.obstacle)})` : ''}`);
  for (const l of detail) {
    if (!l.reponse) continue;
    lignes.push(`    ${l.section ? `${l.section} > ` : ''}${l.question} : ${clip(l.reponse)}`);
  }
  return lignes.join('\n');
}

const SYSTEM = `Tu es l'assistant d'un conseiller en insertion professionnelle qui anime un accompagnement collectif (promo) de personnes en recherche d'emploi.
Tu reçois les fiches hebdomadaires remplies par les participants, identifiés uniquement par un code, et des chiffres déjà calculés.

Ta mission : rédiger un rapport de synthèse utile au conseiller pour piloter la promo et en rendre compte.

Règles :
- Français clair et professionnel, phrases courtes, tutoiement interdit, pas de tiret cadratin.
- Appuie-toi uniquement sur les fiches. N'invente aucun fait, aucun chiffre. Les chiffres viennent du bloc STATISTIQUES : reprends-les tels quels.
- Désigne les personnes par leur code, jamais par une supposition d'identité.
- Aucun diagnostic médical ou psychologique. Décris ce que la personne exprime (« dit manquer d'énergie »), sans l'interpréter.
- Les citations courtes entre « » sont bienvenues quand elles éclairent un point.
- Si une information manque (fiches absentes), dis-le plutôt que de combler.

Réponds par un objet JSON strictement conforme à ce schéma :
{
  "synthese": "8 à 12 lignes : où en est la promo, la dynamique d'ensemble, ce qui ressort",
  "dynamique": "évolution des indicateurs semaine après semaine, en commentant les chiffres fournis",
  "pointsForts": ["ce qui progresse ou fonctionne dans le groupe"],
  "freins": [{ "theme": "frein récurrent", "detail": "comment il s'exprime, combien de personnes, codes concernés" }],
  "vigilance": [{ "code": "code", "motif": "ce qui inquiète, d'après les fiches", "suggestion": "action concrète pour le conseiller" }],
  "pistesCollectives": ["atelier, thème de séance ou action utile pour tout le groupe"],
  "parPersonne": [{ "code": "code", "trajectoire": "2 à 3 phrases sur son évolution", "aSuivre": "point à suivre à la prochaine séance" }]
}
"parPersonne" contient tous les participants ayant au moins une fiche, dans l'ordre des codes.`;

// Texte complet de la promo : statistiques + toutes les fiches, sous les codes.
async function buildPromoText({ conseillerUid, parcours, promo }) {
  const participants = await collectPromo(conseillerUid, parcours.id, promo);
  const stats = computeStats(participants, parcours);
  if (!stats.fiches) throw Object.assign(new Error("Aucune fiche dans cette promo pour l'instant."), { status: 400 });

  const statsText = [
    `Participants : ${stats.participants} (dont ${stats.avecFiches} avec au moins une fiche). Fiches : ${stats.fiches}.`,
    ...stats.etapes.map((e) => `${e.label} : ${e.fiches} fiche(s) ; moyennes ${Object.entries(e.moyennes).map(([k, v]) => `${k} ${v}`).join(', ') || 'n.c.'}${e.engagementsTenus == null ? '' : ` ; engagements tenus ${e.engagementsTenus} %`}`),
  ].join('\n');

  const fichesText = participants.map((p) => (
    `### ${p.code}\n${p.fiches.length ? p.fiches.map(ficheToText).join('\n') : '  (aucune fiche)'}`
  )).join('\n\n');

  const prompt = `PARCOURS : ${parcours.label}\nPROMO : ${promo || '(sans nom)'}\n\nSTATISTIQUES\n${statsText}\n\nFICHES\n${fichesText}`;
  return { participants, stats, prompt };
}

// Export pour traitement hors de l'application (IA au choix du conseiller).
// Markdown : consigne + données, à coller tel quel. CSV : une ligne par réponse.
export async function exportPromo({ conseillerUid, parcoursId, promo, format = 'md' }) {
  const parcours = getParcours(parcoursId);
  if (!parcours) throw Object.assign(new Error('Parcours inconnu.'), { status: 400 });
  const { participants, prompt } = await buildPromoText({ conseillerUid, parcours, promo });

  if (format === 'csv') {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['code', 'semaine', 'fiche', 'confiance', 'moral', 'motivation', 'energie', 'engagement_tenu', 'section', 'question', 'reponse']];
    for (const p of participants) for (const f of p.fiches) {
      const s = f.socle || {};
      const detail = f.source === 'archive' || !f.answers
        ? f.detail || []
        : (getQuestionnaire(f.questionnaireId) ? toDetail(getQuestionnaire(f.questionnaireId), f.answers) : []);
      for (const l of detail) rows.push([p.code, f.etape, f.titre, s.confiance, s.moral, s.motivation, s.energie, s.engagementTenu, l.section, l.question, l.reponse]);
    }
    return '\uFEFF' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
  }

  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `# ${parcours.label} · ${promo || ''} : fiches de suivi\n\nExport Iamonjob du ${date}. Données pseudonymisées (codes). Réponses déclaratives.\n\n## Consigne proposée pour l'IA\n\n${SYSTEM_EXPORT()}\n\n## Données\n\n${prompt}\n`;
}

// Même consigne, rendue en sections lisibles plutôt qu'en JSON (IA externe).
const SYSTEM_EXPORT = () => `${SYSTEM.split('Réponds par un objet JSON')[0]}Présente le rapport avec ces sections :
1. Synthèse (8 à 12 lignes)
2. Dynamique des indicateurs, semaine après semaine
3. Points forts du groupe
4. Freins récurrents (thème, comment il s'exprime, codes concernés)
5. Personnes à surveiller (code, motif, action suggérée)
6. Pistes collectives (ateliers, thèmes de séance)
7. Par personne (trajectoire en 2 ou 3 phrases, point à suivre)`;

export async function generateRapport({ conseillerUid, parcoursId, promo }) {
  const parcours = getParcours(parcoursId);
  if (!parcours) throw Object.assign(new Error('Parcours inconnu.'), { status: 400 });

  const { stats, prompt: full } = await buildPromoText({ conseillerUid, parcours, promo });
  let prompt = full;
  if (prompt.length > MAX_PROMPT) prompt = `${prompt.slice(0, MAX_PROMPT)}\n[… fiches tronquées]`;

  let tokens = 0;
  const raw = await callMistral({
    prompt,
    systemInstruction: SYSTEM,
    isJson: true,
    temperature: 0.3,
    timeoutMs: 120_000,
    fallbackTimeoutMs: 90_000,
    onUsage: ({ tokens: t }) => { tokens += Number(t) || 0; },
  });

  let rapport;
  try {
    rapport = JSON.parse(String(raw).replace(/```json\n?|```/gi, '').trim());
  } catch {
    throw Object.assign(new Error("La réponse de l'IA est illisible. Réessaie."), { status: 502 });
  }

  const ref = adminDb.collection(COL).doc();
  const doc = {
    conseillerUid, parcoursId, promo: promo || null,
    stats, rapport, tokens,
    nbFiches: stats.fiches, nbParticipants: stats.participants,
    createdAt: FieldValue.serverTimestamp(),
  };
  await ref.set(doc);
  return { id: ref.id, ...doc, createdAt: Date.now() };
}

export async function listRapports({ conseillerUid, parcoursId, promo }) {
  const snap = await adminDb.collection(COL).where('conseillerUid', '==', conseillerUid).limit(200).get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data(), createdAt: ms(d.data().createdAt) }))
    .filter((r) => r.parcoursId === parcoursId && (r.promo || '') === (promo || ''))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 10);
}

export async function deleteRapport({ conseillerUid, id }) {
  const ref = adminDb.doc(`${COL}/${id}`);
  const s = await ref.get();
  if (!s.exists || s.data().conseillerUid !== conseillerUid) return false;
  await ref.delete();
  return true;
}
