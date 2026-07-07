// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/avis/[avisId]
//
// POST → le conseiller répond à une demande d'avis. La possession est revérifiée
//        côté modèle (le conseiller ne peut répondre qu'à ses propres demandes).
//
// Accès : rôle `conseiller` requis (custom claim), cookie __session.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { answerAvis } from '@/lib/avis';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  const { avisId } = params;
  const requestId = newRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    await answerAvis({ avisId, conseillerUid: uid, reply: body.reply || '' });
    logEvent({ event: 'avis-answer', requestId, uid, status: 'ok', avisId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logEvent({ event: 'avis-answer', requestId, uid, status: 'error', error: err.message, level: 'error' });
    const code = /introuvable/i.test(err.message) ? 404 : /refusé/i.test(err.message) ? 403 : 400;
    return NextResponse.json({ error: err.message || 'Erreur.' }, { status: code });
  }
}
