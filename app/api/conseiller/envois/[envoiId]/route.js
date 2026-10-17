// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/envois/[envoiId]
//
// DELETE → le conseiller retire un envoi (le bouton disparaît chez la personne).
//          Une réponse déjà donnée à un questionnaire reste dans ses fiches.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { deleteEnvoi } from '@/lib/envois';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    return NextResponse.json(await deleteEnvoi({ envoiId: String(params.envoiId || ''), conseillerUid: uid }));
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Échec.' }, { status: err.status || 500 });
  }
}
