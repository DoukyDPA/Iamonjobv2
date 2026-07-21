// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/beneficiaires
//
// GET  → liste les bénéficiaires du conseiller connecté
// POST → crée un bénéficiaire, renvoie le code pseudonyme à remettre
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
