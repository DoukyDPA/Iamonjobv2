// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/cv-workspace
//
// Espace IAMONCV de l'utilisateur connecté, enregistré sur son compte.
//   GET → { role, who, meta, profiles }   tout l'espace (liste + contenu)
//   PUT → { meta?, profiles? }       changements à appliquer ; un profil à null
//                                    est supprimé
//
// Authentification par le cookie __session (IAMONCV est servi sur la même
// origine). Chacun ne lit et n'écrit que son propre espace : l'uid vient du
// jeton, jamais de la requête. Voir lib/iamoncv-store.js.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { enforceRateLimit } from '@/lib/rate-limit';
import { readWorkspace, writeWorkspace } from '@/lib/iamoncv-store';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

async function authenticate(request) {
  const token = request.cookies.get('__session')?.value;
  if (!token) return { error: 'Votre session a expiré. Reconnectez-vous.', status: 401 };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid, role: decoded.role || null };
  } catch {
    return { error: 'Votre session a expiré. Reconnectez-vous.', status: 401 };
  }
}

export async function GET(request) {
  const requestId = newRequestId();
  const { uid, role, error, status } = await authenticate(request);
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    const { meta, profiles } = await readWorkspace(uid);
    logEvent({ event: 'cv-workspace.read', requestId, uid, status: 'ok', profiles: Object.keys(profiles).length });
    return NextResponse.json({ role, who: uid, meta, profiles }, { headers: NO_STORE });
  } catch (err) {
    logEvent({ event: 'cv-workspace.read', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: 'Lecture de vos CV impossible pour le moment.' }, { status: 500 });
  }
}

export async function PUT(request) {
  const requestId = newRequestId();
  const { uid, error, status } = await authenticate(request);
  if (!uid) return NextResponse.json({ error }, { status });

  // Enregistrement automatique pendant la saisie : plafond large mais présent.
  const rl = await enforceRateLimit({ uid, route: 'cv-workspace', perMinute: 60, perDay: 5000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Trop d\'enregistrements rapprochés. Patientez un instant.' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 });
  }

  const meta = body?.meta && typeof body.meta === 'object' ? body.meta : null;
  const profiles = body?.profiles && typeof body.profiles === 'object' ? body.profiles : {};

  try {
    const { ops } = await writeWorkspace(uid, { meta, profiles });
    logEvent({ event: 'cv-workspace.write', requestId, uid, status: 'ok', ops });
    return NextResponse.json({ ok: true, savedAt: new Date().toISOString() }, { headers: NO_STORE });
  } catch (err) {
    const code = err.status || 500;
    logEvent({ event: 'cv-workspace.write', requestId, uid, status: 'error', error: err.message, level: code >= 500 ? 'error' : 'warn' });
    return NextResponse.json(
      { error: code >= 500 ? 'Enregistrement impossible pour le moment.' : err.message },
      { status: code }
    );
  }
}
