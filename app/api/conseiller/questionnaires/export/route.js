// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/questionnaires/export
//
// GET ?parcoursId=…&promo=…&format=md|csv → toutes les fiches d'une promo, à
// traiter hors de l'application (IA au choix du conseiller, tableur).
//   md  : consigne de synthèse + statistiques + fiches, prêt à coller
//   csv : une ligne par réponse (séparateur ;, UTF-8 avec BOM pour Excel)
//
// Accès : rôle `conseiller`, sur ses propres promos uniquement.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { exportPromo } from '@/lib/questionnaires/rapport';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const slug = (s) => String(s || 'promo').normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  const sp = new URL(request.url).searchParams;
  const format = sp.get('format') === 'csv' ? 'csv' : 'md';
  const promo = sp.get('promo') || '';
  try {
    const body = await exportPromo({ conseillerUid: uid, parcoursId: sp.get('parcoursId'), promo, format });
    logEvent({ event: 'export-promo', requestId: newRequestId(), uid, status: 'ok', format });
    const name = `fiches-${slug(promo)}-${new Date().toISOString().slice(0, 10)}.${format}`;
    return new NextResponse(body, {
      headers: {
        'Content-Type': format === 'csv' ? 'text/csv; charset=utf-8' : 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${name}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "L'export a échoué." }, { status: err.status || 500 });
  }
}
