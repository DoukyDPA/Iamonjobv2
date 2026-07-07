// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/admin/promote
//
// Promeut un compte en conseiller (pose les custom claims role + structureId).
// Opération d'administration ponctuelle, protégée par un secret d'en-tête.
//
// Usage (une fois le compte créé normalement via /signup) :
//   curl -X POST https://<app>/api/admin/promote \
//     -H "x-admin-secret: $ADMIN_SETUP_SECRET" \
//     -H "content-type: application/json" \
//     -d '{"email":"conseiller@cbe-sud94.org","structureId":"cbe-sud94"}'
//
// Le conseiller doit se reconnecter pour que son nouveau token porte le rôle.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const requestId = newRequestId();

  const secret = process.env.ADMIN_SETUP_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'ADMIN_SETUP_SECRET non configuré.' }, { status: 503 });
  }
  if (request.headers.get('x-admin-secret') !== secret) {
    return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const { email, structureId = 'default' } = body;
  if (!email) {
    return NextResponse.json({ error: 'email requis.' }, { status: 400 });
  }

  try {
    const user = await adminAuth.getUserByEmail(email);
    await adminAuth.setCustomUserClaims(user.uid, { role: 'conseiller', structureId });
    logEvent({ event: 'promote-conseiller', requestId, uid: user.uid, status: 'ok' });
    return NextResponse.json({ ok: true, uid: user.uid, role: 'conseiller', structureId });
  } catch (err) {
    logEvent({ event: 'promote-conseiller', requestId, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'Échec de la promotion.' }, { status: 500 });
  }
}
