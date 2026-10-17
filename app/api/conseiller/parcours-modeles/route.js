// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/parcours-modeles
//
// GET  → les parcours (enchaînements de questionnaires) : catalogue + structure
// POST → crée un parcours ; body : { label, description, usage, deblocage,
//        etapes: [{ label, questionnaireId }] }
//
// (L'affectation d'un parcours à des personnes reste sur /api/conseiller/parcours.)
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { listParcours, createParcours } from '@/lib/questionnaires/parcours';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    return NextResponse.json({ parcours: await listParcours({ conseillerUid: uid, structureId: structureId || 'default' }) });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ ok: true, ...(await createParcours({ conseillerUid: uid, structureId: structureId || 'default', definition: body })) });
  } catch (err) {
    return NextResponse.json({ error: err.message || "L'enregistrement a échoué." }, { status: err.status || 500 });
  }
}
