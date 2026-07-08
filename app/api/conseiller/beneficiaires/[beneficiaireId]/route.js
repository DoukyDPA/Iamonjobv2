// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/beneficiaires/[beneficiaireId]
//
// DELETE → le conseiller supprime définitivement un dossier qu'il suit :
//          données applicatives (candidatures, campagnes, CV, avis, usage),
//          puis le compte Firebase Auth s'il avait été activé.
//
// Accès : rôle conseiller, et le dossier doit lui appartenir (conseillerUid).
// Action irréversible (droit à l'effacement, RGPD article 17).
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/session';
import { adminAuth } from '@/lib/firebase/admin';
import { getBeneficiaireById, purgeBeneficiaire } from '@/lib/beneficiaires';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });

  const { beneficiaireId } = params;
  const requestId = newRequestId();

  try {
    const beneficiaire = await getBeneficiaireById(beneficiaireId);
    if (!beneficiaire) {
      return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
    }
    if (beneficiaire.conseillerUid !== uid) {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    }

    const { authUid } = await purgeBeneficiaire(beneficiaireId);

    // Compte d'authentification (seulement si le code avait été activé).
    if (authUid) {
      try { await adminAuth.deleteUser(authUid); } catch { /* déjà absent : on continue */ }
    }

    logEvent({ event: 'beneficiaire-delete', requestId, uid, status: 'ok', beneficiaireId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    logEvent({ event: 'beneficiaire-delete', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: err.message || 'La suppression a échoué.' }, { status: 500 });
  }
}
