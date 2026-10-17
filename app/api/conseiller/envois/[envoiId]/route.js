// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/envois/[envoiId]
//
// DELETE → le conseiller retire un envoi (le bouton disparaît chez la personne).
//          Une réponse déjà donnée à un questionnaire reste dans ses fiches.
// POST   → body { action: 'signe-papier', signe: boolean } : document papier
//          signé avec la personne (ou mention retirée).
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { deleteEnvoi, setSignaturePapier } from '@/lib/envois';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    const body = await request.json().catch(() => ({}));
    if (body.action !== 'signe-papier') return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
    return NextResponse.json(await setSignaturePapier({ envoiId: String(params.envoiId || ''), conseillerUid: uid, signe: body.signe !== false }));
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Échec.' }, { status: err.status || 500 });
  }
}

export async function DELETE(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    return NextResponse.json(await deleteEnvoi({ envoiId: String(params.envoiId || ''), conseillerUid: uid }));
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Échec.' }, { status: err.status || 500 });
  }
}
