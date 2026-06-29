// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/candidature/[candidatureId]
//
// DELETE → supprimer une fiche candidature France Travail
//
// Accès : authentifié uniquement, cookie __session requis.
//         L'utilisateur doit être propriétaire de la candidature.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getCandidatureById, deleteCandidature } from '@/lib/candidature';
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

// ─── DELETE /api/candidature/[candidatureId] ──────────────────────────────

export async function DELETE(request, { params }) {
  const { uid, error, status } = await authenticate(request);
  if (!uid) return NextResponse.json({ error }, { status });

  const { candidatureId } = params;
  const requestId = newRequestId();

  const candidature = await getCandidatureById(candidatureId, uid);
  if (!candidature) {
    return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });
  }

  try {
    await deleteCandidature(candidatureId);
    logEvent({ event: 'candidature-delete', requestId, uid, status: 'ok', candidatureId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logEvent({ event: 'candidature-delete', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'Erreur suppression.' }, { status: 500 });
  }
}
