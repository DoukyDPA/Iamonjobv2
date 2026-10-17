// ════════════════════════════════════════════════════════════════════════════
// Renomme une promo partout où son libellé est écrit : dossiers, fiches de
// suivi, rapports de synthèse, envois du conseiller.
//
//   node --env-file=.env.local scripts/renommer-promo.mjs \
//     --from="Promo 21" --to="Promo 20" [--conseiller=<uid>] [--apply]
//
// Sans --apply : simple décompte, rien n'est écrit. Les identifiants de
// documents (ex. archive__promo-21__xxxx-s1) ne changent pas : ils ne sont
// jamais affichés.
// ════════════════════════════════════════════════════════════════════════════

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : true];
}));
const from = args.from;
const to = args.to;
const apply = Boolean(args.apply);
if (!from || !to || from === to) {
  console.error('Usage : --from="<ancien libellé>" --to="<nouveau libellé>" [--conseiller=<uid>] [--apply]');
  process.exit(1);
}

const e = process.env;
initializeApp({ credential: cert({
  projectId: e.FIREBASE_ADMIN_PROJECT_ID,
  clientEmail: e.FIREBASE_ADMIN_CLIENT_EMAIL,
  privateKey: String(e.FIREBASE_ADMIN_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
}) });
const db = getFirestore();

const COLLECTIONS = ['beneficiaires', 'questionnaireReponses', 'questionnaireRapports', 'envois'];
let total = 0;
for (const col of COLLECTIONS) {
  let q = db.collection(col).where('promo', '==', from);
  if (args.conseiller) q = q.where('conseillerUid', '==', args.conseiller);
  const snap = await q.get();
  console.log(`${col} : ${snap.size} document(s)`);
  total += snap.size;
  if (!apply || !snap.size) continue;
  for (let i = 0; i < snap.docs.length; i += 450) {
    const batch = db.batch();
    snap.docs.slice(i, i + 450).forEach((d) => {
      const patch = { promo: to };
      if (col === 'beneficiaires') patch.updatedAt = FieldValue.serverTimestamp();
      batch.update(d.ref, patch);
    });
    await batch.commit();
  }
}
console.log(apply ? `Renommé : ${total} document(s), « ${from} » → « ${to} ».` : `Simulation : ${total} document(s) à renommer. Relancer avec --apply.`);
