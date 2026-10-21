// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/equipe   (responsable de structure)
//
// GET  → { responsable, structure, membres }. Un conseiller qui n'est pas
//        responsable reçoit { responsable: false } et rien d'autre.
// POST → actions du responsable :
//        { action: 'inviter', email }
//        { action: 'annuler', email }
//        { action: 'retirer', uid, versUid }        départ d'un salarié
//        { action: 'reattribuer', fromUid, toUid }  tous les dossiers
//        { action: 'responsable', email, oui }      nommer / retirer
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import {
  isResponsable, listEquipe, inviter, annulerInvitation, retirerAcces, reattribuer, nommerResponsable,
} from '@/lib/structures';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function guard(request) {
  const s = await requireRole(request, 'conseiller');
  if (!s.uid) return { res: NextResponse.json({ error: s.error }, { status: s.status }) };
  const structureId = s.structureId || 'default';
  const ok = await isResponsable({ email: s.email, structureId });
  return { s: { ...s, structureId }, ok };
}

export async function GET(request) {
  const { res, s, ok } = await guard(request);
  if (res) return res;
  if (!ok) return NextResponse.json({ responsable: false });
  try {
    const { structure, membres } = await listEquipe(s.structureId);
    return NextResponse.json({ responsable: true, moi: s.uid, structure, membres });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { res, s, ok } = await guard(request);
  if (res) return res;
  if (!ok) return NextResponse.json({ error: 'Réservé au responsable de la structure.' }, { status: 403 });
  const requestId = newRequestId();
  const body = await request.json().catch(() => ({}));
  try {
    let out = { ok: true };
    switch (body.action) {
      case 'inviter':
        await inviter({ structureId: s.structureId, email: body.email, parEmail: s.email });
        break;
      case 'annuler':
        await annulerInvitation({ structureId: s.structureId, email: body.email });
        break;
      case 'retirer':
        if (body.uid === s.uid) throw Object.assign(new Error('Vous ne pouvez pas retirer votre propre accès.'), { status: 400 });
        out = { ok: true, ...(await retirerAcces({ structureId: s.structureId, uid: String(body.uid || ''), versUid: body.versUid ? String(body.versUid) : null })) };
        break;
      case 'reattribuer':
        if (!body.fromUid || !body.toUid || body.fromUid === body.toUid) throw Object.assign(new Error('Choisissez deux conseillers différents.'), { status: 400 });
        out = { ok: true, moved: await reattribuer({ structureId: s.structureId, fromUid: String(body.fromUid), toUid: String(body.toUid) }) };
        break;
      case 'responsable':
        await nommerResponsable({ structureId: s.structureId, email: body.email, oui: Boolean(body.oui) });
        break;
      default:
        throw Object.assign(new Error('Action inconnue.'), { status: 400 });
    }
    logEvent({ event: `equipe-${body.action}`, requestId, uid: s.uid, status: 'ok' });
    return NextResponse.json(out);
  } catch (err) {
    logEvent({ event: `equipe-${body.action}`, requestId, uid: s.uid, status: 'error', error: err.message, level: 'warn' });
    return NextResponse.json({ error: err.message || 'Action impossible.' }, { status: err.status || 500 });
  }
}
