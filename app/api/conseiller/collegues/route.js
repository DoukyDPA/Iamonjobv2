// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/collegues
//
// GET → conseillers de la même structure (prénom, email), pour transférer un
//       dossier. Un collègue apparaît après sa première visite de /conseiller.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { listCollegues } from '@/lib/conseiller-profile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    return NextResponse.json({ collegues: await listCollegues({ uid, structureId: structureId || 'default' }) });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}
