// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/questionnaires/[reponseId]
//
// GET → une fiche complète, question par question.
//
// Accès : rôle `conseiller`, et la fiche doit lui être rattachée.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { getReponseForConseiller } from '@/lib/questionnaires/reponses';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    const reponse = await getReponseForConseiller(params.reponseId, uid);
    if (!reponse) return NextResponse.json({ error: 'Fiche introuvable.' }, { status: 404 });
    return NextResponse.json({ reponse });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}
