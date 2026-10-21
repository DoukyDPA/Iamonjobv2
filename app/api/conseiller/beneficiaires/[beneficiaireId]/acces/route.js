// ════════════════════════════════════════════════════════════════════════════
// Route API — /api/conseiller/beneficiaires/[beneficiaireId]/acces
//
// POST → « Réinitialiser l'accès ». La personne a oublié son mot de passe et
//        n'a pas d'e-mail dans l'outil : son conseiller remet le code à l'état
//        « à activer ». Elle repasse par la page d'activation et choisit un
//        nouveau mot de passe, comme la première fois.
//
// Le dossier n'est pas touché : même compte, même CV, mêmes candidatures. On
// coupe seulement les sessions ouvertes (un ordinateur partagé resté connecté).
// Accès : rôle conseiller, dossier qui lui appartient.
// ════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { requireRole } from '@/lib/session';
import { adminAuth, adminDb, FieldValue } from '@/lib/firebase/admin';
import { getBeneficiaireById } from '@/lib/beneficiaires';
import { logEvent, newRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { uid, error, status } = await requireRole(request, 'conseiller');
  if (!uid) return NextResponse.json({ error }, { status });
  const requestId = newRequestId();

  try {
    const b = await getBeneficiaireById(params.beneficiaireId);
    if (!b) return NextResponse.json({ error: 'Dossier introuvable.' }, { status: 404 });
    if (b.conseillerUid !== uid) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 });
    if (b.status !== 'active' && b.status !== 'reset') {
      return NextResponse.json({ error: "Ce code n'a pas encore été activé : la personne peut l'activer directement." }, { status: 409 });
    }

    // Sessions en cours coupées. Compte absent (purgé pour inactivité) : rien
    // à couper, l'activation recréera un compte.
    // L'ancien mot de passe est remplacé par une valeur aléatoire que personne
    // ne connaît : il cesse de fonctionner tout de suite.
    if (b.authUid) {
      try {
        await adminAuth.updateUser(b.authUid, { password: randomBytes(24).toString('base64url') });
        await adminAuth.revokeRefreshTokens(b.authUid);
      } catch (e) {
        if (e.code !== 'auth/user-not-found') throw e;
      }
    }

    await adminDb.doc(`beneficiaires/${b.id}`).set(
      { status: 'reset', resetAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    logEvent({ event: 'beneficiaire-reset-acces', requestId, uid, status: 'ok', beneficiaireId: b.id });
    return NextResponse.json({ ok: true, code: b.code });
  } catch (err) {
    logEvent({ event: 'beneficiaire-reset-acces', requestId, uid, status: 'error', error: err.message, level: 'error' });
    return NextResponse.json({ error: 'La réinitialisation a échoué. Réessayez.' }, { status: 500 });
  }
}
