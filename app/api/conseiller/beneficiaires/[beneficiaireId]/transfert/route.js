// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/beneficiaires/[beneficiaireId]/transfert
//
// POST → transfère le dossier à un collègue de la même structure.
//        body : { toUid }
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { transferBeneficiaire } from '@/lib/beneficiaires';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  const requestId = newRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    const res = await transferBeneficiaire({
      beneficiaireId: params.beneficiaireId,
      fromUid: uid,
      toUid: String(body.toUid || ''),
      structureId: structureId || 'default',
    });
    logEvent({ event: 'beneficiaire-transfert', requestId, uid, status: 'ok', beneficiaireId: params.beneficiaireId });
    return NextResponse.json(res);
  } catch (err) {
    logEvent({ event: 'beneficiaire-transfert', requestId, uid, status: 'error', error: err.message, level: 'warn' });
    return NextResponse.json({ error: err.message || 'Le transfert a échoué.' }, { status: err.status || 500 });
  }
}
