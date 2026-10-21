// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/mon-dossier
//
// GET → ce que la personne accompagnée doit savoir de son propre dossier :
//       les séances où son conseiller a ouvert son espace avec elle
//       (transparence : rien ne se fait dans son dos), et son prochain
//       rendez-vous, pour le rappel de la veille.
// Accès : rôle bénéficiaire.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { getBeneficiaireByAuthUid } from '@/lib/beneficiaires';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'beneficiaire');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    const b = await getBeneficiaireByAuthUid(uid);
    if (!b) return NextResponse.json({ seances: [], prochainRdv: null });
    const seances = (Array.isArray(b.seances) ? b.seances : [])
      .map((s) => Number(s?.at) || 0)
      .filter(Boolean)
      .sort((x, y) => y - x)
      .slice(0, 10);
    return NextResponse.json({ seances, prochainRdv: b.prochainRdv || null }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur.' }, { status: 500 });
  }
}
