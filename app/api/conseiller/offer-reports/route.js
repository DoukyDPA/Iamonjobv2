// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/offer-reports
//
// GET ?status=pending|excluded|kept → signalements « hors sujet » à traiter,
// les plus signalés d'abord. Rôle conseiller requis.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { listOfferReports } from '@/lib/offer-reports';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const STATUSES = new Set(['pending', 'excluded', 'kept']);

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  const wanted = new URL(request.url).searchParams.get('status') || 'pending';
  if (!STATUSES.has(wanted)) return NextResponse.json({ error: 'Statut inconnu.' }, { status: 400 });

  try {
    return NextResponse.json({ reports: await listOfferReports({ status: wanted }) });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}
