// ════════════════════════════════════════════════════════════════════════════
// Reprise unique : copie l'usage historique (collection usage/) vers le miroir
// posé sur chaque dossier bénéficiaire (usageTokensTotal, usageCallsTotal,
// usageMonths). À lancer une seule fois, après le déploiement de la
// dénormalisation. Sans ça, les dossiers existants afficheraient zéro tant
// qu'aucun nouvel appel IA n'a été enregistré.
//
// Usage :
//   node scripts/backfill-usage-mirror.mjs
//
// Variables d'environnement requises (mêmes que l'app) :
//   FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY
// ════════════════════════════════════════════════════════════════════════════

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Clés Firebase Admin manquantes. Renseigne les variables d\'environnement.');
  process.exit(1);
}

initializeApp({
  credential: cert({ projectId, clientEmail, privateKey: privateKey.replace(/\\n/g, '\n') }),
});
const db = getFirestore();

const bens = await db.collection('beneficiaires').get();
console.log(`${bens.size} dossiers à traiter.`);

let updated = 0;
let batch = db.batch();
let inBatch = 0;

for (const ben of bens.docs) {
  const usageSnap = await db.doc(`usage/${ben.id}`).get();
  if (!usageSnap.exists) continue;
  const u = usageSnap.data();

  batch.set(
    ben.ref,
    {
      usageTokensTotal: u.tokensTotal ?? 0,
      usageCallsTotal: u.callsTotal ?? 0,
      usageMonths: u.months ?? {},
    },
    { merge: true }
  );
  updated++;
  inBatch++;

  // Firestore limite un batch à 500 écritures.
  if (inBatch >= 400) {
    await batch.commit();
    batch = db.batch();
    inBatch = 0;
  }
}

if (inBatch > 0) await batch.commit();
console.log(`Terminé. ${updated} dossiers mis à jour.`);
process.exit(0);
