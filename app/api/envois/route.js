// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/envois  (côté personne accompagnée)
//
// GET → offres, messages et questionnaires envoyés par le conseiller, avec la
//       définition des questionnaires et les réponses déjà données.
//
// Accès : rôle `beneficiaire`. Le dossier est retrouvé via authUid.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { getBeneficiaireByAuthUid } from '@/lib/beneficiaires';
import { listEnvoisForBeneficiaire } from '@/lib/envois';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const { uid, error, status } = await requireRole(request, 'beneficiaire');
  if (!uid) return NextResponse.json({ error }, { status });
  try {
    const beneficiaire = await getBeneficiaireByAuthUid(uid);
    if (!beneficiaire) return NextResponse.json({ envois: [], questionnaires: {} });
    return NextResponse.json(await listEnvoisForBeneficiaire(beneficiaire));
  } catch (err) {
    return NextResponse.json({ error: err.message || 'Erreur chargement.' }, { status: 500 });
  }
}
