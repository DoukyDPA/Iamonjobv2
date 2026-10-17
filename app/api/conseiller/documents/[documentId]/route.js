// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/documents/[documentId]
//
// GET    → le document avec un lien de téléchargement signé (1 h)
// DELETE → le retire de la bibliothèque (auteur seulement). Les envois et les
//          signatures déjà recueillies restent.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { archiveDocument, documentForDisplay, getDocument } from '@/lib/documents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  const raw = await getDocument(params.documentId);
  if (!raw || (raw.structureId || 'default') !== (structureId || 'default')) {
    return NextResponse.json({ error: 'Document introuvable.' }, { status: 404 });
  }
  return NextResponse.json({ document: await documentForDisplay(params.documentId) });
}

export async function DELETE(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    return NextResponse.json(await archiveDocument({ id: params.documentId, conseillerUid: uid }));
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Échec.' }, { status: err.status || 500 });
  }
}
