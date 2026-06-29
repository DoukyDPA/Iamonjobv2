// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/candidature
//
// POST → créer une fiche candidature France Travail
// GET  → lister les candidatures de l'utilisateur connecté
//
// Accès : authentifié uniquement, cookie __session requis.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { createCandidature, getCandidatures } from '@/lib/candidature';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authenticate(request) {
  const token = request.cookies.get('__session')?.value;
  if (!token) return { uid: null, error: 'Non authentifié.', status: 401 };
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { uid: decoded.uid };
  } catch {
    return { uid: null, error: 'Session invalide.', status: 401 };
  }
}

// ─── GET /api/candidature ─────────────────────────────────────────────────

export async function GET(request) {
  const { uid, error, status } = await authenticate(request);
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    const candidatures = await getCandidatures(uid);
    return NextResponse.json({ candidatures });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

// ─── POST /api/candidature ────────────────────────────────────────────────

export async function POST(request) {
  const { uid, error, status } = await authenticate(request);
  if (!uid) return NextResponse.json({ error }, { status });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const { offer, compatibility } = body;
  if (!offer || !compatibility) {
    return NextResponse.json({ error: 'offer et compatibility sont requis.' }, { status: 400 });
  }

  const requestId = newRequestId();
  try {
    const { candidatureId } = await createCandidature({ uid, offer, compatibility });
    logEvent({ event: 'candidature-create', requestId, uid, status: 'ok', candidatureId });
    return NextResponse.json({ candidatureId });
  } catch (err) {
    logEvent({ event: 'candidature-create', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'Erreur création.' }, { status: 500 });
  }
}
