// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/offer-report
//
// POST { metier, codeRome, offer } → signale une offre « hors sujet ».
//   - candidat : l'offre est masquée pour lui seul, en attente de validation ;
//   - conseiller : l'offre est exclue pour tous sur ce métier.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { reportOffer } from '@/lib/offer-reports';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { uid, role, error, status } = await getSession(request);
  if (!uid) return NextResponse.json({ error }, { status });

  const rate = await enforceRateLimit({ uid, route: 'offer-report', perMinute: 20, perDay: 200 });
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Trop de signalements. Patientez un instant.' }, { status: 429 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON invalide.' }, { status: 400 });
  }

  const requestId = newRequestId();
  try {
    const result = await reportOffer({
      uid, role, metier: body.metier, codeRome: body.codeRome, offer: body.offer,
    });
    // On ne journalise ni le métier ni l'offre (projet professionnel = donnée perso).
    logEvent({ event: 'offer-report', requestId, uid, status: 'ok', result: result.status });
    return NextResponse.json(result);
  } catch (err) {
    logEvent({ event: 'offer-report', requestId, uid, status: 'error', error: err.message, level: 'warn' });
    return NextResponse.json({ error: err.message || 'Signalement impossible.' }, { status: 400 });
  }
}
