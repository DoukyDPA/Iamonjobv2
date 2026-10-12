// ════════════════════════════════════════════════════════════════════════════
// Rattache les fiches archivées d'une promo (importées par
// import-questionnaires-archive.mjs, sous leur code d'origine) aux dossiers
// Iamonjob des mêmes personnes. Chaque fiche devient la réponse du dossier à
// l'étape correspondante : le conseiller retrouve tout l'historique sur une
// seule ligne, dans la promo actuelle du dossier.
//
// Rapprochement : le code d'archive (ex. NKCC) est la fin du code du dossier
// (ex. AC-2026-018-NKCC). Si aucun dossier ne correspond exactement, on
// accepte un seul caractère d'écart (saisie : 6/G, 5/S, 9/A…) quand il est
// unique, puis, s'il reste un seul code et un seul dossier, on les apparie.
// Ces cas sont signalés. Un appariement peut être forcé : --force=XXXX:3DYP
//
// Usage :
//   node --env-file=.env.local scripts/rattacher-archives-questionnaires.mjs \
//     --promo-archive="PROMO 45+ · octobre 2026" --promo-dossiers="Promo 21" \
//     [--force=CODE:SUFFIXE,…] [--apply]
//
// Sans --apply : simulation, rien n'est écrit. Une fiche déjà remplie dans
// l'app pour la même étape n'est jamais écrasée (fiche archive conservée).
// ════════════════════════════════════════════════════════════════════════════

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : true];
}));
const promoArchive = args['promo-archive'] || 'PROMO 45+ · octobre 2026';
const promoDossiers = args['promo-dossiers'];
const apply = Boolean(args.apply);
const forced = Object.fromEntries(String(args.force || '').split(',').filter(Boolean).map((p) => p.split(':')));

if (!promoDossiers) {
  console.error('Usage : --promo-dossiers="<libellé de la promo des dossiers>" [--promo-archive=…] [--force=CODE:SUFFIXE] [--apply]');
  process.exit(1);
}

const e = process.env;
initializeApp({ credential: cert({
  projectId: e.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: e.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: String(e.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
}) });
const db = getFirestore();

const arch = await db.collection('questionnaireReponses')
  .where('source', '==', 'archive').where('promo', '==', promoArchive).get();
const fiches = arch.docs.filter((d) => !d.data().beneficiaireId);
if (!fiches.length) { console.log('Aucune fiche archivée à rattacher.'); process.exit(0); }

const conseillerUid = fiches[0].data().conseillerUid;
const dossiersSnap = await db.collection('beneficiaires')
  .where('conseillerUid', '==', conseillerUid).where('promo', '==', promoDossiers).get();
const dossiers = dossiersSnap.docs.map((d) => ({ id: d.id, ...d.data(), suffix: String(d.data().code || '').split('-').pop() }));

const codes = [...new Set(fiches.map((d) => d.data().participant))].sort();
const dist = (a, b) => (a.length !== b.length ? 99 : [...a].filter((c, i) => c !== b[i]).length);

const pairs = new Map(); // code archive → { dossier, how }
const libres = new Set(dossiers.map((d) => d.id));
const take = (code, d, how) => { pairs.set(code, { dossier: d, how }); libres.delete(d.id); };

for (const [code, suffix] of Object.entries(forced)) {
  const d = dossiers.find((x) => x.suffix === suffix);
  if (d) take(code, d, 'forcé');
}
for (const code of codes) {
  if (pairs.has(code)) continue;
  const d = dossiers.find((x) => libres.has(x.id) && x.suffix === code);
  if (d) take(code, d, 'exact');
}
for (const code of codes) {
  if (pairs.has(code)) continue;
  const c = dossiers.filter((x) => libres.has(x.id) && dist(x.suffix, code) === 1);
  if (c.length === 1) take(code, c[0], '1 caractère d\'écart');
}
const restants = codes.filter((c) => !pairs.has(c));
if (restants.length === 1 && libres.size === 1) {
  take(restants[0], dossiers.find((x) => libres.has(x.id)), 'par élimination');
}

console.log(`Promo archivée « ${promoArchive} » → dossiers « ${promoDossiers} »\n`);
for (const code of codes) {
  const p = pairs.get(code);
  const n = fiches.filter((d) => d.data().participant === code).length;
  console.log(`  ${code.padEnd(5)} → ${p ? `${p.dossier.code.padEnd(18)} ${p.how === 'exact' ? '' : `(${p.how})`}` : 'NON RATTACHÉ'}  · ${n} fiche(s)`);
}
const sansFiche = dossiers.filter((d) => libres.has(d.id));
if (sansFiche.length) console.log(`\n  Dossiers sans fiche archivée : ${sansFiche.map((d) => d.code).join(', ')}`);

let moved = 0, kept = 0;
const batch = db.batch();
for (const doc of fiches) {
  const f = doc.data();
  const p = pairs.get(f.participant);
  if (!p) continue;
  const target = db.doc(`questionnaireReponses/${p.dossier.id}__${f.questionnaireId}`);
  const existing = await target.get();
  if (existing.exists && existing.data().source !== 'archive') {
    console.log(`  ! ${p.dossier.code} S${f.etape} déjà remplie dans l'app : fiche archive laissée à part.`);
    kept += 1;
    continue;
  }
  batch.set(target, {
    ...f,
    conseillerUid: p.dossier.conseillerUid,
    beneficiaireId: p.dossier.id,
    participant: p.dossier.code,
    promo: p.dossier.promo,
    parcoursId: p.dossier.parcoursId || f.parcoursId,
    archiveCode: f.participant,
    archivePromo: promoArchive,
    archiveDocId: doc.id,
    rattacheAt: FieldValue.serverTimestamp(),
  });
  batch.delete(doc.ref);
  moved += 1;
}

console.log(`\n${moved} fiche(s) à rattacher, ${kept} laissée(s) à part.`);
if (!apply) { console.log('Simulation : rien n\'a été écrit. Relancer avec --apply.'); process.exit(0); }
await batch.commit();
console.log('Rattachement effectué.');
