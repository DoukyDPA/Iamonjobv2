// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/questionnaires
//
// GET → réponses aux questionnaires de suivi des personnes suivies (fiches
//       remplies dans l'app et fiches archivées), plus le catalogue des parcours
//       pour construire le tableau de suivi.
//
// Accès : rôle `conseiller`. Seules ses propres réponses remontent.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { listReponsesForConseiller } from '@/lib/questionnaires/reponses';
import { listParcours } from '@/lib/questionnaires/parcours';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    const reponses = await listReponsesForConseiller(uid);
    const parcours = await listParcours({ conseillerUid: uid, structureId: structureId || 'default', withArchived: true });
    return NextResponse.json({ parcours, reponses });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}
