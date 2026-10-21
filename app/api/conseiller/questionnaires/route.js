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
import { getSeuils, setSeuils } from '@/lib/questionnaires/seuils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    const reponses = await listReponsesForConseiller(uid);
    const parcours = await listParcours({ conseillerUid: uid, structureId: structureId || 'default', withArchived: true });
    const seuils = await getSeuils(structureId || 'default').catch(() => ({}));
    return NextResponse.json({ parcours, reponses, seuils });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

// PUT → règle les seuils d'alerte d'un parcours pour la structure.
//       body { parcoursId, baisse, noteBasse }
export async function PUT(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    const body = await request.json().catch(() => ({}));
    const seuils = await setSeuils({ structureId: structureId || 'default', parcoursId: String(body.parcoursId || ''), baisse: body.baisse, noteBasse: body.noteBasse });
    return NextResponse.json({ ok: true, seuils });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Enregistrement impossible.' }, { status: err.status || 500 });
  }
}
