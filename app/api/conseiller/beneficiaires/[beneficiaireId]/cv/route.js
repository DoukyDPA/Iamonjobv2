// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/beneficiaires/[beneficiaireId]/cv
//
// CV IAMONCV rattachés au dossier d'une personne.
//   GET                 → liste des CV de son espace IAMONCV (nom, date)
//   GET ?profil=ID      → contenu d'un CV, pour le reprendre dans l'espace du
//                         conseiller (après ses retouches, par exemple)
//   POST { name, data } → dépose un CV préparé par le conseiller dans
//                         l'espace de la personne : nouveau profil, modifiable
//
// Accès : conseiller du dossier, accès activé et accord donné.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { getBeneficiaireById } from '@/lib/beneficiaires';
import { listProfilesMeta, readProfileOf, addProfileTo } from '@/lib/iamoncv-store';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function dossier(request, params) {
  const s = await requireRole(request, 'conseiller');
  if (!s.uid) return { res: NextResponse.json({ error: s.error }, { status: s.status }) };
  const b = await getBeneficiaireById(params.beneficiaireId);
  if (!b) return { res: NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 }) };
  if (b.conseillerUid !== s.uid) return { res: NextResponse.json({ error: 'Accès refusé.' }, { status: 403 }) };
  if (b.status !== 'active' || !b.authUid) return { res: NextResponse.json({ error: "La personne n'a pas encore activé son accès." }, { status: 409 }) };
  if (b.consentStatus !== 'granted') return { res: NextResponse.json({ error: "La personne n'a pas donné son accord." }, { status: 403 }) };
  return { s, b };
}

export async function GET(request, { params }) {
  const { res, b } = await dossier(request, params);
  if (res) return res;
  const profil = new URL(request.url).searchParams.get('profil');
  try {
    if (profil) {
      const data = await readProfileOf(b.authUid, profil);
      if (!data) return NextResponse.json({ error: 'CV introuvable.' }, { status: 404 });
      return NextResponse.json({ data, code: b.code }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ profils: await listProfilesMeta(b.authUid), code: b.code }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Lecture impossible.' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { res, s, b } = await dossier(request, params);
  if (res) return res;
  const requestId = newRequestId();
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.data || typeof body.data !== 'object') return NextResponse.json({ error: 'CV manquant.' }, { status: 400 });
    const name = String(body.name || '').trim() || `CV préparé avec votre conseiller (${new Date().toLocaleDateString('fr-FR')})`;
    const profileId = await addProfileTo(b.authUid, { name, data: body.data });
    logEvent({ event: 'cv-envoye-personne', requestId, uid: s.uid, status: 'ok', beneficiaireId: b.id });
    return NextResponse.json({ ok: true, profileId, code: b.code });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Envoi impossible.' }, { status: err.status || 500 });
  }
}
