// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/parcours
//
// POST → affecte un parcours de questionnaires (et une promo) à des personnes
//        suivies, ou le retire.
//        body : { beneficiaireIds: string[], parcoursId: string|null, promo?: string }
//
// Accès : rôle `conseiller` ; seuls ses propres dossiers sont modifiés.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { setParcoursForBeneficiaires } from '@/lib/questionnaires/reponses';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  const requestId = newRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    const result = await setParcoursForBeneficiaires({
      conseillerUid: uid,
      beneficiaireIds: Array.isArray(body.beneficiaireIds) ? body.beneficiaireIds : [],
      parcoursId: body.parcoursId || null,
      promo: body.promo || '',
    });
    logEvent({ event: 'parcours-assign', requestId, uid, status: 'ok', parcoursId: body.parcoursId || null, updated: result.updated });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logEvent({ event: 'parcours-assign', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || "L'affectation a échoué." }, { status: err.status || 500 });
  }
}
