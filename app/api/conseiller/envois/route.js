// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/envois
//
// GET  → envois du conseiller (?beneficiaireId=… pour une seule personne)
// POST → envoie une offre, un message ou un questionnaire
//        body : { type: 'offre'|'message'|'questionnaire',
//                 beneficiaireIds: string[], promo?: string,
//                 texte?, offre?: { intitule, entreprise, lieu, url },
//                 questionnaireId? }
//
// Accès : rôle `conseiller` ; seuls ses propres dossiers sont visés.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { createEnvois, listEnvoisForConseiller } from '@/lib/envois';
import { enforceRateLimit } from '@/lib/rate-limit';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    const beneficiaireId = new URL(request.url).searchParams.get('beneficiaireId') || null;
    const envois = await listEnvoisForConseiller(uid, { beneficiaireId });
    return NextResponse.json({ envois });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  const limit = await enforceRateLimit({ uid, route: 'conseiller-envoi', perMinute: 20, perDay: 300 });
  if (!limit.allowed) return NextResponse.json({ error: "Trop d'envois rapprochés. Patientez un peu." }, { status: 429 });

  const requestId = newRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    const result = await createEnvois({
      conseillerUid: uid,
      structureId: structureId || 'default',
      beneficiaireIds: Array.isArray(body.beneficiaireIds) ? body.beneficiaireIds : [],
      type: body.type,
      promo: body.promo || null,
      payload: { texte: body.texte, offre: body.offre, questionnaireId: body.questionnaireId },
    });
    logEvent({ event: 'conseiller-envoi', requestId, uid, status: 'ok', type: body.type, created: result.created });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    logEvent({ event: 'conseiller-envoi', requestId, uid, status: 'error', error: err.message, level: 'warn' });
    return NextResponse.json({ error: err.message || "L'envoi a échoué." }, { status: err.status || 500 });
  }
}
