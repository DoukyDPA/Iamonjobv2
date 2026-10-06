// ════════════════════════════════════════════════════════════════════════════
// Import unique : fiches de suivi d'une promo suivie hors Iamonjob (tableau de
// bord « Suivi PROMO 45+ ») vers la collection questionnaireReponses, en
// source « archive ». Elles apparaissent ensuite dans l'espace conseiller,
// sous leur code d'origine, en lecture seule.
//
// Usage :
//   node scripts/import-questionnaires-archive.mjs \
//     --file="/chemin/promo45-fiches-archive.json" \
//     --conseiller=prenom.nom@exemple.fr \
//     --promo="PROMO 45+ · octobre 2026" \
//     [--parcours=promo45] [--dry-run]
//
// Le fichier de fiches contient des réponses libres personnelles : il reste
// hors du dépôt Git. Relancer le script remplace les fiches déjà importées
// (même identifiant), sans doublon.
//
// Variables d'environnement requises (mêmes que l'app) :
//   FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
// ════════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.length ? v.join('=') : true];
  })
);

const file = args.file;
const email = args.conseiller;
const promo = args.promo || 'PROMO 45+ · octobre 2026';
const parcoursId = args.parcours || 'promo45';
const dryRun = Boolean(args['dry-run']);

if (!file || (!email && !dryRun)) {
  console.error('Usage : --file=<fiches.json> --conseiller=<email> [--promo=…] [--parcours=promo45] [--dry-run]');
  process.exit(1);
}

const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const SOCLE_KEYS = ['confiance', 'moral', 'motivation', 'energie', 'change', 'frein', 'petitPas',
  'engagementTenu', 'obstacle', 'capable', 'engagement'];

const raw = JSON.parse(readFileSync(file, 'utf8'));
const fiches = Array.isArray(raw) ? raw : raw.fiches;
if (!Array.isArray(fiches) || !fiches.length) {
  console.error('Aucune fiche trouvée dans le fichier.');
  process.exit(1);
}

function toDoc(f, conseillerUid) {
  const socle = {};
  for (const k of SOCLE_KEYS) {
    const v = f[k];
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) continue;
    socle[k] = v;
  }
  const when = f.maj ? Timestamp.fromDate(new Date(f.maj)) : null;
  return {
    source: 'archive',
    conseillerUid,
    beneficiaireId: null,
    participant: String(f.code || '').trim(),
    promo,
    parcoursId,
    etape: Number(f.semaine),
    questionnaireId: `${parcoursId}-s${Number(f.semaine)}`,
    version: null,
    titre: f.theme || '',
    detail: (f.thematique || []).map((t) => ({
      section: t.section || '',
      question: t.question || '',
      reponse: t.reponse || '',
    })),
    socle,
    submittedAt: when,
    updatedAt: FieldValue.serverTimestamp(),
    importedAt: FieldValue.serverTimestamp(),
  };
}

const problems = fiches.filter((f) => !f.code || !Number.isFinite(Number(f.semaine)));
if (problems.length) {
  console.error(`${problems.length} fiche(s) sans code ou sans semaine, import interrompu.`);
  process.exit(1);
}

const codes = [...new Set(fiches.map((f) => f.code))].sort();
console.log(`${fiches.length} fiches, ${codes.length} participants (${codes.join(', ')}), promo « ${promo} ».`);

if (dryRun) {
  const sample = toDoc(fiches[0], '(conseiller)');
  console.log('Exemple de document :', JSON.stringify({ ...sample, updatedAt: '…', importedAt: '…' }, null, 2).slice(0, 1500));
  console.log('Simulation terminée, rien n\'a été écrit.');
  process.exit(0);
}

const { FIREBASE_ADMIN_PROJECT_ID: projectId, FIREBASE_ADMIN_CLIENT_EMAIL: clientEmail, FIREBASE_ADMIN_PRIVATE_KEY: privateKey } = process.env;
if (!projectId || !clientEmail || !privateKey) {
  console.error('Clés Firebase Admin manquantes. Renseigne les variables d\'environnement.');
  process.exit(1);
}
initializeApp({ credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }) });
const db = getFirestore();

const user = await getAuth().getUserByEmail(email).catch(() => null);
if (!user) {
  console.error(`Aucun compte pour ${email}.`);
  process.exit(1);
}
if (user.customClaims?.role !== 'conseiller') {
  console.error(`${email} n'a pas le rôle conseiller.`);
  process.exit(1);
}

const prefix = `archive__${slug(promo)}__`;
let batch = db.batch();
let n = 0;
for (const f of fiches) {
  const id = `${prefix}${slug(f.code)}-s${Number(f.semaine)}`;
  batch.set(db.doc(`questionnaireReponses/${id}`), toDoc(f, user.uid));
  n += 1;
  if (n % 400 === 0) { await batch.commit(); batch = db.batch(); }
}
await batch.commit();
console.log(`${n} fiches importées pour ${email} (promo « ${promo} »).`);
