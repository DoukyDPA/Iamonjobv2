// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/parcours-modeles/[parcoursId]
//
// PUT    → modifie un parcours de la structure (auteur seulement). Déjà suivi :
//          étapes existantes figées, ajout à la fin et intitulés seulement.
// DELETE → le retire de la liste (archivé : les personnes qui le suivent continuent)
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { updateParcours, archiveParcours } from '@/lib/questionnaires/parcours';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ ok: true, ...(await updateParcours({ id: params.parcoursId, conseillerUid: uid, structureId: structureId || 'default', definition: body })) });
  } catch (err) {
    return NextResponse.json({ error: err.message || "L'enregistrement a échoué." }, { status: err.status || 500 });
  }
}

export async function DELETE(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    return NextResponse.json({ ok: true, ...(await archiveParcours({ id: params.parcoursId, conseillerUid: uid })) });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Échec.' }, { status: err.status || 500 });
  }
}
