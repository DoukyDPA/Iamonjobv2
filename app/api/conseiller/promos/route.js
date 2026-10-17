// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/promos
//
// POST → archive ou réactive une promo terminée.
//        body : { parcoursId, promo, archivee: boolean }
//        Rien n'est supprimé : participants, fiches et envois restent, et
//        l'accompagnement individuel continue.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { setPromoArchivee } from '@/lib/questionnaires/reponses';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  const requestId = newRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    const res = await setPromoArchivee({
      conseillerUid: uid,
      parcoursId: String(body.parcoursId || ''),
      promo: String(body.promo || ''),
      archivee: Boolean(body.archivee),
    });
    logEvent({ event: 'promo-archive', requestId, uid, status: 'ok', archivee: Boolean(body.archivee) });
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Échec.' }, { status: err.status || 500 });
  }
}
