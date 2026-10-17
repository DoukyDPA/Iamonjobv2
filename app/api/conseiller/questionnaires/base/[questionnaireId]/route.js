// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/questionnaires/base/[questionnaireId]
//
// PUT    → modifie un questionnaire perso (auteur seulement, version +1)
// DELETE → le retire de la base (archivé, jamais effacé : réponses existantes)
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { updatePerso, archivePerso } from '@/lib/questionnaires/base';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ ok: true, ...(await updatePerso({ id: params.questionnaireId, conseillerUid: uid, definition: body })) });
  } catch (err) {
    return NextResponse.json({ error: err.message || "L'enregistrement a échoué." }, { status: err.status || 500 });
  }
}

export async function DELETE(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    return NextResponse.json({ ok: true, ...(await archivePerso({ id: params.questionnaireId, conseillerUid: uid })) });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Échec.' }, { status: err.status || 500 });
  }
}
