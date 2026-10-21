// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/beneficiaires
//
// GET  → liste les bénéficiaires du conseiller connecté
// POST → crée un bénéficiaire, renvoie le code pseudonyme à remettre.
//        body { count: 2 à 30 } : crée un lot de codes (une promo).
//
// Accès : rôle `conseiller` requis (custom claim), cookie __session.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { createBeneficiaire, listBeneficiaires } from '@/lib/beneficiaires';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── GET ─────────────────────────────────────────────────────────────────

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  try {
    // La liste embarque déjà l'usage de chaque dossier (miroir maintenu par
    // recordUsage), donc plus de seconde lecture par bénéficiaire ici.
    const beneficiaires = await listBeneficiaires(uid);
    return NextResponse.json({ beneficiaires });
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}

// ─── POST ────────────────────────────────────────────────────────────────

export async function POST(request) {
  const { uid, structureId, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  const requestId = newRequestId();
  const body = await request.json().catch(() => ({}));
  const count = Math.floor(Number(body?.count) || 1);

  // Création en lot (une promo) : de 2 à 30 codes d'un coup.
  if (count > 1) {
    if (count > 30) return NextResponse.json({ error: 'Trente codes au maximum à la fois.' }, { status: 400 });
    const codes = [];
    try {
      for (let i = 0; i < count; i++) {
        const r = await createBeneficiaire({ conseillerUid: uid, structureId: structureId || 'default' });
        codes.push(r);
      }
      logEvent({ event: 'beneficiaire-create-lot', requestId, uid, status: 'ok', count });
      return NextResponse.json({ codes });
    } catch (err) {
      logEvent({ event: 'beneficiaire-create-lot', requestId, uid, status: 'error', error: err.message, level: 'error', created: codes.length });
      // Les codes déjà créés sont renvoyés : rien n'est perdu.
      return NextResponse.json({ codes, error: `Création interrompue après ${codes.length} code(s).` }, { status: codes.length ? 207 : 500 });
    }
  }

  try {
    const { beneficiaireId, code } = await createBeneficiaire({
      conseillerUid: uid,
      structureId: structureId || 'default',
    });
    logEvent({ event: 'beneficiaire-create', requestId, uid, status: 'ok', beneficiaireId });
    return NextResponse.json({ beneficiaireId, code });
  } catch (err) {
    logEvent({ event: 'beneficiaire-create', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'Erreur création.' }, { status: 500 });
  }
}
