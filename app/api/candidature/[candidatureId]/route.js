// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/candidature/[candidatureId]
//
// GET    → récupérer une fiche candidature France Travail
// PATCH  → mise à jour partielle (notes personnelles de suivi, statut)
// DELETE → supprimer une fiche candidature France Travail
//
// Accès : authentifié uniquement, cookie __session requis.
//         L'utilisateur doit être propriétaire de la candidature.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';
import { getCandidatureById, deleteCandidature, updateCandidature } from '@/lib/candidature';
import { logEvent, newRequestId } from '@/lib/logger';

const VALID_STATUSES = ['saved', 'applying', 'sent', 'rejected', 'interview'];

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

// ─── GET /api/candidature/[candidatureId] ────────────────────────────────

export async function GET(request, { params }) {
  const { uid, error, status } = await authenticate(request);
  if (!uid) return NextResponse.json({ error }, { status });

  const { candidatureId } = params;
  const candidature = await getCandidatureById(candidatureId, uid);
  if (!candidature) {
    return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });
  }
  return NextResponse.json({ candidature });
}

// ─── PATCH /api/candidature/[candidatureId] ───────────────────────────────

export async function PATCH(request, { params }) {
  const { uid, error, status } = await authenticate(request);
  if (!uid) return NextResponse.json({ error }, { status });

  const { candidatureId } = params;
  const requestId = newRequestId();

  const candidature = await getCandidatureById(candidatureId, uid);
  if (!candidature) {
    return NextResponse.json({ error: 'Candidature introuvable.' }, { status: 404 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const updates = {};
  if (body.notes !== undefined) updates.notes = String(body.notes).slice(0, 4000);
  if (body.status !== undefined) {
    if (!VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: `Statut invalide : ${body.status}.` }, { status: 400 });
    }
    updates.status = body.status;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Aucun champ modifiable fourni.' }, { status: 400 });
  }

  try {
    await updateCandidature(candidatureId, updates);
    logEvent({ event: 'candidature-update', requestId, uid, status: 'ok', candidatureId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logEvent({ event: 'candidature-update', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'Erreur mise à jour.' }, { status: 500 });
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
