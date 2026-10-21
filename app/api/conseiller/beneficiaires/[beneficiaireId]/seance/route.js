// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/beneficiaires/[beneficiaireId]/seance
//
// POST → « Travailler avec AC-… » en rendez-vous. Le conseiller ouvre l'espace
//        de la personne, sans son mot de passe, pour que tout ce qu'ils font
//        ensemble (analyse, métiers, candidatures, CV) aille dans SON dossier.
//
// Garde-fous :
//   - dossier du conseiller, accès activé, consentement accordé ;
//   - séance tracée dans le dossier, et visible par la personne (« Votre
//     conseiller a travaillé avec vous le 17 octobre ») ;
//   - jeton de connexion à usage unique, marqué « séance conseiller ».
// Renvoie un jeton personnalisé Firebase que le navigateur échange contre une
// session de la personne.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { adminAuth, adminDb, FieldValue } from '@/lib/firebase/admin';
import { getBeneficiaireById } from '@/lib/beneficiaires';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  const requestId = newRequestId();

  try {
    const b = await getBeneficiaireById(params.beneficiaireId);
    if (!b) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
    if (b.conseillerUid !== uid) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    if (b.status !== 'active' || !b.authUid) {
      return NextResponse.json({ error: "La personne n'a pas encore activé son code. Activez-le ensemble d'abord, avec un mot de passe qu'elle choisit." }, { status: 409 });
    }
    if (b.consentStatus !== 'granted') {
      return NextResponse.json({ error: "La personne n'a pas donné son accord : impossible d'ouvrir son espace." }, { status: 403 });
    }

    try {
      await adminAuth.getUser(b.authUid);
    } catch {
      return NextResponse.json({ error: 'Le compte de la personne a été supprimé (inactivité). Réinitialisez son accès.' }, { status: 409 });
    }

    const at = Date.now();
    await adminDb.doc(`beneficiaires/${b.id}`).set({
      seances: FieldValue.arrayUnion({ conseillerUid: uid, at }),
      derniereSeance: at,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // Revendications ajoutées au jeton : l'interface affiche le bandeau de
    // séance, les journaux savent qui agit.
    const token = await adminAuth.createCustomToken(b.authUid, { seanceConseiller: uid, seanceAt: at });

    logEvent({ event: 'seance-conseiller', requestId, uid, status: 'ok', beneficiaireId: b.id });
    return NextResponse.json({ token, code: b.code });
  } catch (err) {
    logEvent({ event: 'seance-conseiller', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: "Impossible d'ouvrir l'espace de la personne." }, { status: 500 });
  }
}
