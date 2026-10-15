// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/offer-reports/[reportId]
//
// POST { decision: 'excluded' | 'kept' | 'pending' } → le conseiller tranche :
//   excluded = hors sujet, l'offre disparaît pour tous sur ce métier ;
//   kept     = l'offre est pertinente, elle reste visible ;
//   pending  = annule une décision (retour en file).
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { decideOfferReport } from '@/lib/offer-reports';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const requestId = newRequestId();
  try {
    const { reportId } = params;
    const result = await decideOfferReport({ id: reportId, decision: body.decision, uid });
    logEvent({ event: 'offer-report-decision', requestId, uid, status: 'ok', result: result.status });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Décision impossible.' }, { status: 400 });
  }
}
