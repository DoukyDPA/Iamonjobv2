// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/questionnaires/rapport
//
// GET    ?parcoursId=…&promo=…  → rapports déjà générés pour cette promo
// POST   { parcoursId, promo }  → génère un rapport de synthèse (Mistral)
// DELETE ?id=…                  → supprime un rapport
//
// Accès : rôle `conseiller`, sur ses propres promos uniquement.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { enforceRateLimit } from '@/lib/rate-limit';
import { generateRapport, listRapports, deleteRapport } from '@/lib/questionnaires/rapport';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  const sp = new URL(request.url).searchParams;
  try {
    const rapports = await listRapports({ conseillerUid: uid, parcoursId: sp.get('parcoursId'), promo: sp.get('promo') || '' });
    return NextResponse.json({ rapports });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  const limit = await enforceRateLimit({ uid, route: 'rapport-promo', perMinute: 2, perDay: 20 });
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Trop de rapports demandés. Patiente un peu avant de relancer.' }, { status: 429 });
  }

  const requestId = newRequestId();
  const startedAt = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const rapport = await generateRapport({
      conseillerUid: uid,
      parcoursId: String(body.parcoursId || ''),
      promo: String(body.promo || ''),
    });
    logEvent({ event: 'rapport-promo', requestId, uid, status: 'ok', tokens: rapport.tokens, durationMs: Date.now() - startedAt });
    return NextResponse.json({ rapport });
  } catch (err) {
    logEvent({ event: 'rapport-promo', requestId, uid, status: 'error', error: err.message, durationMs: Date.now() - startedAt, level: 'error' });
    return NextResponse.json({ error: err.message || 'La génération a échoué.' }, { status: err.status || 500 });
  }
}

export async function DELETE(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  const id = new URL(request.url).searchParams.get('id');
  const ok = id ? await deleteRapport({ conseillerUid: uid, id }) : false;
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'Rapport introuvable.' }, { status: 404 });
}
