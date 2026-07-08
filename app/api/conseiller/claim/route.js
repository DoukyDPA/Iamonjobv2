// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/claim
//
// POST → un utilisateur qui vient de se connecter/s'inscrire demande le rôle
//        conseiller. On vérifie son email contre la liste d'autorisation, et si
//        c'est bon on pose le custom claim role=conseiller sur son compte.
//
// Le client doit ensuite rafraîchir son token (getIdToken(true)) pour que le
// rôle apparaisse, puis reposer le cookie de session.
//
// Publique au sens middleware (pas encore de rôle), mais l'accès réel est gardé
// par la vérification du token Firebase ET de la liste d'autorisation.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { isConseillerAllowed, conseillerStructureId } from '@/lib/conseiller-allowlist';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const requestId = newRequestId();

  let token;
  try {
    ({ token } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }
  if (!token) return NextResponse.json({ error: 'Token requis.' }, { status: 400 });

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Session invalide.' }, { status: 401 });
  }

  const email = decoded.email || '';
  if (!isConseillerAllowed(email)) {
    logEvent({ event: 'conseiller-claim', requestId, uid: decoded.uid, status: 'refused' });
    return NextResponse.json(
      { error: "Cet email n'est pas autorisé comme conseiller. Rapprochez-vous de votre structure." },
      { status: 403 }
    );
  }

  try {
    // Idempotent : si le rôle est déjà posé, on ne réécrit pas inutilement.
    if (decoded.role !== 'conseiller') {
      await adminAuth.setCustomUserClaims(decoded.uid, {
        role: 'conseiller',
        structureId: conseillerStructureId(),
      });
    }
    logEvent({ event: 'conseiller-claim', requestId, uid: decoded.uid, status: 'ok' });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logEvent({ event: 'conseiller-claim', requestId, uid: decoded.uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'Échec.' }, { status: 500 });
  }
}
