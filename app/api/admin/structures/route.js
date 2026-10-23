// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/admin/structures   (administrateur de la plateforme)
//
// Réservée aux adresses listées dans ADMIN_EMAILS (et connectées en conseiller).
// GET  → { admin, structures }. Un non-administrateur reçoit { admin: false }.
// POST → { action: 'creer', nom }
//        { action: 'renommer', structureId, nom }
//        { action: 'responsable', structureId, email }         nommer / inviter
//        { action: 'retirerResponsable', structureId, email }
//        { action: 'annuler', structureId, email }             invitation
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import {
  isPlatformAdmin, listStructures, creerStructure, renommerStructure,
  nommerResponsableStructure, nommerResponsable, annulerInvitation,
} from '@/lib/structures';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function guard(request) {
  const s = await requireRole(request, 'conseiller');
  if (!s.uid) return { res: NextResponse.json({ error: s.error }, { status: s.status }) };
  return { s, ok: isPlatformAdmin(s.email) };
}

const sid = (v) => {
  const id = String(v || '');
  if (!/^[a-z0-9-]{1,40}$/.test(id)) throw Object.assign(new Error('Structure inconnue.'), { status: 400 });
  return id;
};

export async function GET(request) {
  const { res, ok } = await guard(request);
  if (res) return res;
  if (!ok) return NextResponse.json({ admin: false });
  try {
    return NextResponse.json({ admin: true, structures: await listStructures() });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

export async function POST(request) {
  const { res, s, ok } = await guard(request);
  if (res) return res;
  if (!ok) return NextResponse.json({ error: "Réservé à l'administrateur de la plateforme." }, { status: 403 });
  const requestId = newRequestId();
  const body = await request.json().catch(() => ({}));
  try {
    let out = { ok: true };
    switch (body.action) {
      case 'creer':
        out = { ok: true, id: await creerStructure({ nom: body.nom }) };
        break;
      case 'renommer':
        await renommerStructure({ structureId: sid(body.structureId), nom: body.nom });
        break;
      case 'responsable':
        out = { ok: true, ...(await nommerResponsableStructure({ structureId: sid(body.structureId), email: body.email, parEmail: s.email })) };
        break;
      case 'retirerResponsable':
        await nommerResponsable({ structureId: sid(body.structureId), email: body.email, oui: false });
        break;
      case 'annuler':
        await annulerInvitation({ structureId: sid(body.structureId), email: body.email });
        await nommerResponsable({ structureId: sid(body.structureId), email: body.email, oui: false });
        break;
      default:
        throw Object.assign(new Error('Action inconnue.'), { status: 400 });
    }
    logEvent({ event: `admin-structures-${body.action}`, requestId, uid: s.uid, status: 'ok' });
    return NextResponse.json(out);
  } catch (err) {
    logEvent({ event: `admin-structures-${body.action}`, requestId, uid: s.uid, status: 'error', error: err.message, level: 'warn' });
    return NextResponse.json({ error: err.message || 'Action impossible.' }, { status: err.status || 500 });
  }
}
