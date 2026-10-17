// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/questionnaires/base
//
// GET  → la base de questionnaires : catalogue (PROMO 45+…) + questionnaires
//        créés dans la structure
// POST → crée un questionnaire ; body : { titre, intro, sections }
//
// Accès : rôle `conseiller`.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { listBase, createPerso } from '@/lib/questionnaires/base';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    return NextResponse.json({ questionnaires: await listBase({ conseillerUid: uid, structureId: structureId || 'default' }) });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  const requestId = newRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    const res = await createPerso({ conseillerUid: uid, structureId: structureId || 'default', definition: body });
    logEvent({ event: 'questionnaire-perso-create', requestId, uid, status: 'ok' });
    return NextResponse.json({ ok: true, ...res });
  } catch (err) {
    return NextResponse.json({ error: err.message || "L'enregistrement a échoué." }, { status: err.status || 500 });
  }
}
